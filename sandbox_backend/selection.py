"""One tenant-scoped selection for the grid, column choices and editor actions."""
import inspect

from fastapi.params import Param

from app.routes import pricing
from app.services.finance_report_cache import cached_finance_report
from app.services.pricing_shared_filters import matching_pricing_offer_ids
from app.services.product_facets import load_product_filter_records
from sandbox_backend.query import matches_row, normalized


@cached_finance_report('sandbox-pricing-row-set-v1', require_period=False)
async def pricing_rows(session, tenant):
    # Resolve FastAPI defaults explicitly when calling its handler internally.
    defaults = {key: value.default.default for key, value in inspect.signature(pricing.list_configs).parameters.items()
                if isinstance(value.default, Param)}
    defaults.update(page_size=500, include_finance_history=False)
    rows = []
    while True:
        result = await pricing.list_configs(**defaults, tenant=tenant, session=session)
        rows.extend(result['items'])
        if len(rows) >= result['total'] or not result['items']:
            return {**result, 'items': rows}
        defaults['page'] += 1


async def candidate_rows(session, tenant, filters):
    data = await pricing_rows(session=session, tenant=tenant)
    # The original selector owns name/SKU matching, product facets, margin rules,
    # promotional status and tenant boundaries. Do not reproduce that logic.
    allowed = await matching_pricing_offer_ids(session, tenant.id, filters.shared)
    if filters.category:
        categories = {record.offer_id for record in await load_product_filter_records(session, tenant.id)
                      if (record.category or '__empty__') in filters.category}
        allowed = categories if allowed is None else allowed & categories
    return data, [row for row in data['items'] if allowed is None or row['offer_id'] in allowed]


async def selected_rows(session, tenant, filters):
    data, rows = await candidate_rows(session, tenant, filters)
    return data, [row for row in rows if matches_row(row, filters)]


def page_result(data, rows, page, size, sort_by, direction):
    def key(row):
        value = row.get(sort_by)
        return (value is None, normalized(value) if isinstance(value, str) else value)
    # Stable article order resolves ties, including duplicate product names.
    ordered = sorted(rows, key=lambda row: row['offer_id'])
    ordered.sort(key=key, reverse=direction == 'desc')
    items = ordered[(page - 1) * size:page * size]
    return {**data, 'items': items, 'total': len(rows), 'page': page, 'page_size': size,
            'sort_by': sort_by, 'sort_direction': direction,
            'ready_on_page': sum(row.get('readiness_status') == 'ready' for row in items),
            'blocked_on_page': sum(row.get('readiness_status') == 'blocked' for row in items),
            'inactive_on_page': sum(row.get('readiness_status') == 'inactive' for row in items),
            'uncalculated_total': sum(row.get('last_attempt_ok') is False for row in rows)}
