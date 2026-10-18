import json

import pytest

from sandbox_backend.query import parse_filters, matches_row, column_value, distinct_values


def test_prices_use_displayed_percentage_units_and_decimal_comma():
    query = parse_filters({'column_filters': json.dumps({
        'effective_margin': {'min': '19,5', 'max': '20', 'values': []},
    })})
    assert matches_row({'effective_margin': 0.2}, query)
    assert not matches_row({'effective_margin': 0.21}, query)
    assert not matches_row({'effective_margin': None}, query)
    assert column_value({'effective_margin': 0.2}, 'effective_margin') == '20'


def test_column_choices_exclude_only_own_rule():
    query = parse_filters({'column_filters': json.dumps({
        'calculated_price': {'values': ['100']},
        'ship_method': {'values': ['ПВЗ']},
    })})
    rows = [
        {'calculated_price': 100, 'ship_method': 'ПВЗ'},
        {'calculated_price': 200, 'ship_method': 'ПВЗ'},
        {'calculated_price': 300, 'ship_method': 'СЦ'},
    ]
    assert distinct_values(rows, query, 'calculated_price') == ['100', '200']
    assert [row['calculated_price'] for row in rows if matches_row(row, query)] == [100]


def test_empty_values_and_zero_are_distinct():
    query = parse_filters({'column_filters': '{"actual_cost":{"values":["__empty__"]}}'})
    assert matches_row({'actual_cost': None}, query)
    assert not matches_row({'actual_cost': 0}, query)
    assert column_value({'actual_cost': 0}, 'actual_cost') == '0'
    assert matches_row({'actual_cost': 123}, parse_filters({'column_filters': '{"actual_cost":{"values":[]}}'}))


def test_facets_are_translated_to_existing_business_filter_contract():
    query = parse_filters({'ship_method': '["ПВЗ","СЦ"]', 'brand': '["Docke"]',
                           'article': '00-1', 'margin_min': '15', 'promo_below_minimum': False})
    assert query.shared.filter_values == {'ship_method': ['ПВЗ', 'СЦ'], 'brand': ['Docke']}
    assert query.shared.offer_query == '00-1'
    assert str(query.shared.target_margin_min) == '0.15'
    assert query.shared.promo_below_minimum is False


def test_any_conditions_do_not_replace_other_filters_or_plan_scheme():
    query = parse_filters({'plan_ship_method': '["RFBS"]', 'logic': 'any', 'conditions': json.dumps([
        {'field': 'name', 'operator': 'contains', 'value': 'ёж'},
        {'field': 'calculated_price', 'operator': 'gte', 'value': '200'},
    ])})
    assert matches_row({'name': 'Ежик', 'plan_ship_method': 'RFBS', 'ship_method': 'ПВЗ'}, query)
    assert not matches_row({'calculated_price': 300, 'plan_ship_method': 'FBS'}, query)


def test_plan_family_uses_existing_excel_scheme_normalization_only():
    query = parse_filters({'plan_ship_method': '["RFBS"]'})
    assert matches_row({'plan_ship_method': 'Рфбс', 'ship_method': 'ПВЗ'}, query)
    assert not matches_row({'plan_ship_method': 'ПВЗ', 'ship_method': 'РФБС'}, query)
    assert not matches_row({'plan_ship_method': None}, query)
    assert matches_row({'plan_ship_method': 'СЦ'}, parse_filters({'plan_ship_method': '["FBS"]'}))


@pytest.mark.parametrize('raw', [
    {'unknown': 'x'}, {'column_filters': '{broken'},
    {'column_filters': '{"secret":{"values":["x"]}}'},
    {'column_filters': '{"calculated_price":{"min":"NaN"}}'},
    {'column_filters': '{"calculated_price":{"min":"200","max":"100"}}'},
    {'column_filters': '{"name":{"min":"2"}}'},
    {'conditions': '[{"field":"name","operator":"sql","value":"x"}]'},
    {'conditions': '[{"field":"calculated_price","operator":"gt","value":"wat"}]'},
    {'brand': '["Docke",null]'}, {'margin_min': '20', 'margin_max': '10'},
])
def test_invalid_filters_are_rejected_instead_of_silently_widening_scope(raw):
    with pytest.raises(ValueError):
        parse_filters(raw)
