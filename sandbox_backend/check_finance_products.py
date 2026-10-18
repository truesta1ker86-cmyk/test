"""Read-only contract and amount checks on the isolated HTTP service."""
import json
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlencode

from sandbox_backend.check_live import call
from sandbox_backend.finance_selection import articles_for, common

PERIOD = {'start': '2026-09-19', 'end': '2026-10-18'}


def get(endpoint='report', **params):
    return call('workspace-v2/finance/' + endpoint + '?' + urlencode({**PERIOD, **params}))


def money_sum(rows, field):
    return sum((Decimal(str(row.get(field) or 0)) for row in rows), Decimal(0)).quantize(Decimal('.01'))


def main():
    results = {}
    for view in ('profit', 'gross', 'weekly', 'market'):
        original = get(view=view)['report']
        products = original['_filter_products']
        assert products, view
        candidate = next((p for p in products if p.get('brand')), products[0])
        offer = candidate['offer_id']
        params = {'view': view, 'product': offer, 'category': candidate['category'],
                  'product_type': candidate['product_type']}
        if candidate.get('brand'):
            params['facets'] = json.dumps({'brand': [candidate['brand']]})
        filtered = get(**params)['report']
        rows = articles_for(view, filtered)
        assert rows and {r['offer_id'] for r in rows} == {offer}, (view, offer)
        source = {r['offer_id']: r for r in articles_for(view, original) if not common(r)}
        for row in rows:
            assert row == source[row['offer_id']], (view, 'article changed')
        assert filtered.get('distribution') == original.get('distribution')
        fields = get('filter-values', **params)['fields']
        assert fields == filtered['_filter_options']
        assert offer in {r['value'] for r in fields['product']}
        expected_choices = {p['offer_id'] for p in products if p['category'] == candidate['category']
                            and p['product_type'] == candidate['product_type']
                            and (not candidate.get('brand') or p.get('brand') == candidate['brand'])}
        assert {r['value'] for r in fields['product']} == expected_choices
        assert get('filter-values', view=view)['total'] == len(products)
        # Every characteristic supports real values and an explicit missing value.
        for key in ('report_category', 'report_type', 'brand', 'series', 'color', 'length_mm', 'product_group', 'fin_type'):
            value = str(candidate.get(key)) if candidate.get(key) not in (None, '') else '__empty__'
            report = get(view=view, facets=json.dumps({key: [value]}))['report']
            selected = {r['offer_id'] for r in articles_for(view, report) if not common(r)}
            expected = {p['offer_id'] for p in products if
                        (str(p.get(key)) if p.get(key) not in (None, '') else '__empty__') == value}
            assert selected == expected, (view, key, len(selected), len(expected))
        empty = get(view=view, product='__no_financial_offer__')['report']
        assert not articles_for(view, empty)
        assert empty['_filter_scope']['selected_products'] == 0
        if view == 'profit':
            for key, value in filtered['totals'].items():
                assert Decimal(value) == money_sum(rows, key), (view, key)
        elif view == 'gross':
            for key in ('ozon_accrual', 'cost', 'net_profit'):
                assert Decimal(filtered['totals'][key]) == money_sum(rows, key)
            for month in filtered['totals']['months']:
                parts = [next(m for m in row['months'] if m['key'] == month['key']) for row in rows]
                assert Decimal(month['cost']) == money_sum(parts, 'cost')
                assert Decimal(month['ozon_accrual']) == money_sum(parts, 'ozon_accrual')
        elif view == 'weekly':
            for i, week in enumerate(filtered['totals']):
                assert Decimal(week['orders_amount']) == money_sum([r['weeks'][i] for r in rows], 'orders_amount')
        # A second request with no selections restores the original totals exactly.
        assert get(view=view)['report'].get('totals') == original.get('totals')
        results[view] = {'period_products': len(products), 'offer': offer, 'selected': len(rows),
                         'facets_checked': 8, 'source_amounts_preserved': True, 'reset': True}
    for params in ({'facets': '{'}, {'start': '2026-02-30'},
                   {'column_filters': '{"profit":{"secret":{}}}'}):
        call('workspace-v2/finance/report?' + urlencode({**PERIOD, **params}), expected=422)
    period = get(view='gross', start='2026-10-01', end='2026-10-18')['report']
    assert [m['key'] for m in period['months']] == ['2026-10']
    result = {'period': PERIOD, 'views': results, 'invalid_requests_rejected': True, 'period_change': True}
    folder = Path('.tmp/finance-product-filters-2026-10-18')
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'http-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
