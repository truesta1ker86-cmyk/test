"""Copy-only finance adapter: original calculations, then product selection."""
import json
from copy import deepcopy
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException, Request
from app.db import get_session
from app.routes import finance_v2
from app.schemas.finance_v2 import FinanceQuery as NativeQuery
from app.services.excel_finance_views import product_report_groups
from app.services.finance_report_cache import cached_finance_report
from app.services.product_facets import load_product_filter_records
from sandbox_backend.routes import read_access
from sandbox_backend.finance_selection import (FinanceQuery, PRODUCT_VIEWS, metadata_for,
    articles_for, common, matches_product, filter_options, normalized)
from sandbox_backend.finance_aggregation import profit_subset, gross_subset, weekly_subset

router = APIRouter()
TEXT_FIELDS = {'label', 'product_name', 'report_category', 'report_type', 'product_type', 'offer_id'}
FIELDS = {
    'profit': {'product_name', 'report_category', 'report_type', 'units_sold', 'revenue',
               'ozon_accrual', 'cost', 'gross_profit', 'tax', 'profit', 'margin_pct'},
    'gross': {'label', 'product_type', 'offer_id', 'product_name', 'ozon_accrual', 'cost',
              'gross_profit', 'gross_margin_pct', 'net_profit'},
    'weekly': {'label', 'product_name', 'product_type'},
    'market': {'label', 'seller_price', 'seller_promo_price', 'marketplace_promo_price',
               'marketplace_card_price', 'market_min_price', 'min_competitor_price', 'min_price'},
}


async def finance_query(request: Request):
    try:
        query = FinanceQuery.model_validate(dict(request.query_params))
    except ValueError as error:
        raise HTTPException(422, 'Некорректные параметры финансового отбора.') from error
    finance_v2.validate_period(query)
    return query


@cached_finance_report('sandbox-financial-filter-source-v1', require_period=False)
async def source_data(session, tenant, view, start, end):
    # Access flags are applied outside this tenant-scoped cache for each actor.
    access = SimpleNamespace(tenant=tenant, is_owner=False, role='viewer')
    result = await finance_v2.report(NativeQuery(view=view, start=start, end=end, q=''), access, session)
    catalog = {}
    for row in await load_product_filter_records(session, tenant.id):
        catalog[row.offer_id] = {'name': row.name, 'fin_type': row.fin_type,
            'brand': row.facets.brand, 'series': row.facets.series, 'color': row.facets.color,
            'length_mm': row.facets.length_mm, 'product_group': row.facets.group}
    groups = await product_report_groups(session, tenant.id)
    return {'data': result, 'products': metadata_for(view, result['report'], catalog, groups)}


def column_rules(query, report):
    from sandbox_backend.finance_operations import Rule
    try:
        raw = json.loads(query.column_filters or '{}').get(query.view, {})
        rules = {key: Rule.model_validate(value) for key, value in raw.items()}
        allowed = set(FIELDS[query.view])
        if query.view == 'gross':
            allowed |= {'month:' + m['key'] + ':' + key for m in report.get('months', [])
                        for key in ('ozon_accrual', 'cost', 'gross_profit', 'gross_margin_pct')}
        if query.view == 'weekly':
            allowed |= {str(i) + ':' + key for i, _ in enumerate(report.get('periods', []))
                        for key in ('orders', 'dynamics', 'cancelled', 'rate')}
        if set(rules) - allowed or any(key in TEXT_FIELDS and (r.min or r.max) for key, r in rules.items()):
            raise ValueError()
        return {key: rule for key, rule in rules.items()
                if rule.values is not None or rule.text.strip() or rule.min or rule.max}
    except (ValueError, TypeError, ArithmeticError) as error:
        raise HTTPException(422, 'Некорректные условия финансовых столбцов.') from error


def projection(view, row, meta):
    values = {key: row.get(key) for key in FIELDS[view]}
    name = meta.get('name') or row.get('product_name') or row.get('name') or row.get('offer_id') or 'Общие операции Ozon'
    category = meta.get('category') or row.get('report_category') or row.get('category') or 'Общие операции'
    kind = meta.get('product_type') or row.get('report_type') or row.get('product_type') or 'Без типа'
    if view == 'profit':
        values.update(product_name=name + ' · ' + str(row.get('offer_id') or ''),
                      report_category=category, report_type=kind)
    elif view == 'market':
        values['label'] = name + ' · ' + str(row.get('offer_id') or '')
        values['marketplace_card_price'] = row.get('marketplace_card_price', row.get('card_price'))
    else:
        values.update(label=category, product_name=name, product_type=kind, offer_id=row.get('offer_id'))
        if view == 'gross':
            if row.get('is_complete') is False:
                values.update(cost=None, gross_profit=None, gross_margin_pct=None)
            for month in row.get('months', []):
                for key in ('ozon_accrual', 'cost', 'gross_profit', 'gross_margin_pct'):
                    values['month:' + month['key'] + ':' + key] = (
                        None if key != 'ozon_accrual' and month.get('is_complete') is False else month.get(key))
        else:
            aliases = {'orders': 'orders_amount', 'cancelled': 'cancelled_amount',
                       'dynamics': 'dynamics_pct', 'rate': 'cancellation_rate_pct'}
            for i, week in enumerate(row.get('weeks', [])):
                for key, source in aliases.items():
                    values[str(i) + ':' + key] = week.get(source)
    return values


def apply_selection(data, products, query):
    from sandbox_backend.finance_operations import matches
    result = deepcopy(data)
    report = result['report']
    by_offer = {p['offer_id']: p for p in products}
    rules = column_rules(query, report)
    active = query.product_active() or bool(query.q.strip()) or bool(rules)
    pairs = []
    for item in articles_for(query.view, report):
        meta = by_offer.get(str(item.get('offer_id')), {})
        if common(item):
            eligible = not query.product_active() and (not query.q.strip() or all(
                term in normalized(item.get('name') or item.get('product_name') or 'Общие операции Ozon')
                for term in normalized(query.q).split()))
        else:
            eligible = matches_product(meta, query)
        pairs.append((item, meta, projection(query.view, item, meta), eligible))
    selected = [item for item, _, values, eligible in pairs if eligible and matches(values, rules)]
    if active:
        if query.view == 'profit':
            report = profit_subset(report, selected)
        elif query.view == 'gross':
            report = gross_subset(report, {r.get('offer_id') for r in selected})
        elif query.view == 'weekly':
            report = weekly_subset(report, selected)
        else:
            report.update(items=selected, total=len(selected))
    if query.view == 'market':
        for item in report.get('items', []):
            item.setdefault('marketplace_card_price', item.get('card_price'))
    # Cascades use the financial period's complete product universe, including
    # historical offers. Own fields are excluded when expanding a selection.
    column_products = [meta for _, meta, values, _ in pairs if meta and matches(values, rules)]
    fields = filter_options(column_products, query)
    options = {}
    for field in set().union(*(values.keys() for _, _, values, _ in pairs)) if pairs else FIELDS[query.view]:
        values = [p[field] for _, _, p, eligible in pairs if eligible and field in p and matches(p, rules, exclude=field)]
        options[field] = sorted({str(v) if v is not None and v != '' else '__empty__' for v in values})
    source_count = len(products)
    report.update(_filter_products=deepcopy(column_products), _filter_options=fields,
                  _column_options=options, _filters_applied=True,
                  _filter_scope={'supported': True, 'active': active, 'source_products': source_count,
                    'selected_products': sum(not common(r) for r in selected), 'selected_rows': len(selected),
                    'allocation': 'original_period', 'view': query.view})
    result['report'] = report
    return result


async def product_report(query, access, session):
    finance_v2.validate_period(query)
    source = await source_data(session=session, tenant=access.tenant, view=query.view,
                               start=query.start, end=query.end)
    result = apply_selection(source['data'], source['products'], query)
    result['can_manage'] = access.is_owner or access.role == 'manager'
    return result


@router.get('/api/workspace-v2/finance/filter-values')
async def filter_values(query=Depends(finance_query), access=Depends(read_access), session=Depends(get_session)):
    if query.view not in PRODUCT_VIEWS:
        return {'view': query.view, 'fields': {}, 'total': 0, 'supported': False}
    result = await product_report(query, access, session)
    report = result['report']
    return {'view': query.view, 'fields': report['_filter_options'], 'supported': True,
            'total': report['_filter_scope']['selected_products']}
