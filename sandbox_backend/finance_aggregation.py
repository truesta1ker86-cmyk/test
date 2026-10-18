"""Aggregate selected, already calculated financial articles; never redistribute."""
from copy import deepcopy
from collections import defaultdict
from decimal import Decimal
from app.services.excel_finance_views import _category_margin_totals, _weekly_period_totals, _money
from app.services.profit import _margin


def profit_subset(report, items):
    result = deepcopy(report)
    result['items'] = deepcopy(items)
    result['_source_totals'] = deepcopy(report.get('totals', {}))
    result['totals'] = {key: _money(sum((Decimal(str(row.get(key) or 0)) for row in items), Decimal(0)))
                        for key in report.get('totals', {})}
    result['total_units_sold'] = sum(Decimal(str(row.get('units_sold') or 0)) for row in items)
    result['margin_pct'] = _margin(Decimal(result['totals'].get('ozon_accrual') or 0),
                                  Decimal(result['totals'].get('profit') or 0))
    result['is_complete'] = (all(row.get('is_complete', True) for row in items)
        and report.get('allocation_complete', True)
        and report.get('reconciliation', {}).get('is_balanced', True))
    result['missing_cost_offer_ids'] = [r.get('offer_id') for r in items if not r.get('is_complete', True)]
    offers = {r.get('offer_id') for r in items}
    if 'scheme_items' in result:
        result['scheme_items'] = [r for r in result['scheme_items'] if r.get('offer_id') in offers]
    return result


def gross_totals(items):
    return _category_margin_totals([{**row, 'missing_cost_items': row.get('missing_cost_items', int(not row.get('is_complete', True)))} for row in items])


def gross_subset(report, selected):
    result = deepcopy(report)
    result['_source_totals'] = deepcopy(report.get('totals', {}))
    rows = []
    for group in report.get('rows', []):
        articles = [deepcopy(a) for a in group.get('articles', []) if a.get('offer_id') in selected]
        if not articles:
            continue
        row = {**deepcopy(group), **gross_totals(articles), 'articles': articles}
        row['months'] = [
            {'key': month['key'], **gross_totals([next((m for m in a.get('months', []) if m['key'] == month['key']), {})
                                                 for a in articles])}
            for month in report.get('months', [])]
        rows.append(row)
    result['rows'] = rows
    result['totals'] = gross_totals([a for r in rows for a in r['articles']])
    result['totals']['months'] = [{'key': month['key'], **gross_totals([
        next((m for m in row['months'] if m['key'] == month['key']), {}) for row in rows])}
        for month in report.get('months', [])]
    result['is_complete'] = result['totals']['is_complete'] and report.get('allocation_complete', True) and report.get('reconciliation_complete', True)
    result['totals']['is_complete'] = result['is_complete']
    if 'audit_rows' in result:
        result['audit_rows'] = [row for row in result['audit_rows'] if row.get('offer_id') in selected]
    return result


def weekly_subset(report, articles):
    result = deepcopy(report)
    groups, categories = defaultdict(list), defaultdict(list)
    for row in articles:
        groups[(row.get('category'), row.get('product_type'))].append(deepcopy(row))
        categories[row.get('category')].append(deepcopy(row))
    periods = report.get('periods', [])
    def weeks(items):
        return _weekly_period_totals(items, periods)
    result['rows'] = [{'category': category, 'product_type': kind, 'articles': items, 'weeks': weeks(items)}
                      for (category, kind), items in groups.items()]
    result['category_rows'] = [{'category': category, 'articles': items, 'weeks': weeks(items)}
                               for category, items in categories.items()]
    result['article_rows'] = deepcopy(articles)
    result['_source_totals'] = deepcopy(report.get('totals', []))
    result['totals'] = weeks(articles)
    return result
