import json
from copy import deepcopy
from decimal import Decimal

import pytest
from sandbox_backend.finance_selection import FinanceQuery, metadata_for, matches_product, filter_options
from sandbox_backend.finance_aggregation import profit_subset, gross_subset, weekly_subset
from sandbox_backend.finance_filters import apply_selection


def test_metadata_uses_financial_labels_and_retains_historical_offers():
    report = {'rows': [{'category': 'Отчётная категория', 'product_type': 'Отчётный тип', 'articles': [
        {'offer_id': 'old', 'product_name': 'Docke исторический товар', 'cost': '12'},
        {'offer_id': 'common', 'is_common': True},
    ]}]}
    metadata = metadata_for('gross', report, {}, {})
    assert len(metadata) == 1
    assert metadata[0]['offer_id'] == 'old'
    assert metadata[0]['category'] == metadata[0]['report_category'] == 'Отчётная категория'
    assert metadata[0]['brand'] == 'Docke'
    assert metadata[0]['product_type'] == 'Отчётный тип'


def test_cascade_excludes_own_selection_and_resets_dependent_hierarchy():
    products = [
        {'offer_id': 'A', 'name': 'A', 'category': 'C1', 'product_type': 'T1', 'brand': 'B'},
        {'offer_id': 'B', 'name': 'B', 'category': 'C2', 'product_type': 'T2', 'brand': 'B'},
        {'offer_id': 'C', 'name': 'C', 'category': 'C2', 'product_type': 'T3', 'brand': 'Other'},
    ]
    query = FinanceQuery(category='C1', product_type='T1', product='A', facets='{"brand":["B"]}')
    options = filter_options(products, query)
    assert [r['value'] for r in options['category']] == ['C1', 'C2']
    assert [r['value'] for r in options['product_type']] == ['T1']
    assert [r['value'] for r in options['product']] == ['A']
    assert matches_product(products[0], query)
    assert not matches_product(products[1], query)


def test_any_within_facet_and_between_facets_empty_and_literal_search():
    query = FinanceQuery(facets=json.dumps({'brand': ['A', 'B'], 'color': ['__empty__']}))
    assert matches_product({'offer_id': '1', 'brand': 'A', 'color': None}, query)
    assert not matches_product({'offer_id': '1', 'brand': 'C', 'color': None}, query)
    assert not matches_product({'offer_id': '1', 'brand': 'A', 'color': 'белый'}, query)
    assert not matches_product({'offer_id': 'ABC', 'name': 'Товар'}, FinanceQuery(article='%'))


@pytest.mark.parametrize('facets', ['{', '[]', '{"secret":["x"]}', '{"brand":"x"}', '{"brand":[null]}'])
def test_invalid_facets_do_not_silently_widen_scope(facets):
    with pytest.raises(ValueError):
        FinanceQuery(facets=facets)


def test_gross_keeps_month_costs_and_global_distribution_unchanged():
    article = {'offer_id': 'A', 'revenue': '200', 'ozon_accrual': '150', 'cost': '40', 'net_profit': '90', 'is_complete': True,
        'months': [{'key': '2026-09', 'ozon_accrual': '50', 'cost': '10', 'gross_profit': '40'},
                   {'key': '2026-10', 'ozon_accrual': '100', 'cost': '30', 'gross_profit': '70'}]}
    other = {**deepcopy(article), 'offer_id': 'B', 'cost': '900'}
    source = {'rows': [{'category': 'C', 'product_type': 'T', 'articles': [article, other]}],
        'months': [{'key': '2026-09'}, {'key': '2026-10'}], 'totals': {'cost': '940'},
        'distribution': [{'coefficient': '0.85'}], 'cost_source': 'period_costs'}
    original = deepcopy(source)
    result = gross_subset(source, {'A'})
    assert source == original
    assert result['totals']['cost'] == '40.00'
    assert [m['cost'] for m in result['totals']['months']] == ['10.00', '30.00']
    assert result['totals']['gross_profit'] == '110.00'
    assert result['distribution'] == original['distribution']
    assert result['rows'][0]['articles'][0] == article


def test_summary_does_not_redistribute_or_retax_the_selected_article():
    selected = {'offer_id': 'A', 'ozon_accrual': '100', 'cost': '40', 'tax': '7', 'profit': '53', 'units_sold': '2'}
    report = {'items': [selected, {'offer_id': None, 'ozon_accrual': '1000'}],
              'totals': {'ozon_accrual': '1100', 'cost': '40', 'tax': '7', 'profit': '1053'},
              'distribution': [{'coefficient': '2'}]}
    result = profit_subset(report, [selected])
    assert result['totals'] == {'ozon_accrual': '100.00', 'cost': '40.00', 'tax': '7.00', 'profit': '53.00'}
    assert result['distribution'] == report['distribution']
    assert result['items'][0] == selected


def test_summary_retains_native_margin_sign_for_negative_accruals():
    article = {'offer_id': 'A', 'ozon_accrual': '-100', 'profit': '-30'}
    result = profit_subset({'totals': {'ozon_accrual': '-100', 'profit': '-30'}}, [article])
    assert result['margin_pct'] == '30.0'


def test_weekly_rebuilds_groups_and_weighted_percentages_from_selected_articles():
    periods = [{'from': '2026-10-01', 'to': '2026-10-07'}, {'from': '2026-10-08', 'to': '2026-10-14'}]
    article = {'offer_id': 'A', 'category': 'C', 'product_type': 'T', 'weeks': [
        {'orders_amount': '10', 'orders_units': 1, 'cancelled_amount': '5', 'cancelled_units': 1},
        {'orders_amount': '20', 'orders_units': 2, 'cancelled_amount': '0', 'cancelled_units': 0}]}
    result = weekly_subset({'periods': periods, 'totals': []}, [article])
    assert result['totals'][0]['cancellation_rate_pct'] == '33.3'
    assert result['totals'][1]['dynamics_pct'] == '100.0'
    assert result['rows'][0]['weeks'] == result['totals']


def test_api_selection_preserves_unfiltered_totals_and_does_not_mutate_cached_source():
    items = [{'offer_id': 'A', 'product_name': 'A', 'ozon_accrual': '100.00', 'profit': '70.00', 'cost': '20.00', 'tax': '10.00'},
             {'offer_id': None, 'is_common': True, 'ozon_accrual': '0.01', 'profit': '0.01'}]
    source = {'report': {'items': items, 'totals': {'ozon_accrual': '100.01', 'profit': '70.01'},
                        'distribution': [{'coefficient': '1.7'}]}}
    original = deepcopy(source)
    products = [{'offer_id': 'A', 'name': 'A', 'category': 'C', 'product_type': 'T', 'brand': 'B'}]
    unfiltered = apply_selection(source, products, FinanceQuery())
    assert unfiltered['report']['totals'] == original['report']['totals']
    assert unfiltered['report']['items'] == items
    result = apply_selection(source, products, FinanceQuery(category='C'))
    assert result['report']['totals']['ozon_accrual'] == '100.00'
    assert result['report']['_filter_scope']['selected_products'] == 1
    assert result['report']['distribution'] == original['report']['distribution']
    assert source == original
    empty = apply_selection(source, products, FinanceQuery(product='NOT-IN-REPORT'))
    assert empty['report']['items'] == []
    assert empty['report']['totals']['profit'] == '0.00'


def test_api_populates_options_and_column_rules_share_primary_selection():
    products = [{'offer_id': key, 'name': key, 'category': 'C', 'product_type': 'T', 'brand': brand}
                for key, brand in [('A', 'One'), ('B', 'Two')]]
    source = {'report': {'items': [{'offer_id': 'A', 'profit': '12', 'ozon_accrual': '20'},
                                  {'offer_id': 'B', 'profit': '24', 'ozon_accrual': '30'}],
                         'totals': {'profit': '36'}}}
    query = FinanceQuery(category='C', facets='{"brand":["One"]}',
                         column_filters='{"profit":{"profit":{"min":"10"}}}')
    result = apply_selection(source, products, query)['report']
    assert [r['offer_id'] for r in result['items']] == ['A']
    assert [r['value'] for r in result['_filter_options']['brand']] == ['One', 'Two']
    assert result['_column_options']['profit'] == ['12']


def test_unknown_columns_are_rejected_instead_of_discarded():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:
        apply_selection({'report': {'items': []}}, [], FinanceQuery(column_filters='{"profit":{"secret":{}}}'))
    assert error.value.status_code == 422


def test_gross_column_variants_use_the_visible_empty_value_for_incomplete_costs():
    from sandbox_backend.finance_filters import projection
    row = {'offer_id': 'A', 'is_complete': False, 'cost': '10', 'gross_profit': '20',
        'ozon_accrual': '30', 'months': [{'key': '2026-10', 'is_complete': False,
        'cost': '10', 'gross_profit': '20', 'ozon_accrual': '30'}]}
    values = projection('gross', row, {})
    assert values['cost'] is None
    assert values['gross_profit'] is None
    assert values['ozon_accrual'] == '30'
    assert values['month:2026-10:cost'] is None
    assert values['month:2026-10:ozon_accrual'] == '30'
    assert row['cost'] == '10'
