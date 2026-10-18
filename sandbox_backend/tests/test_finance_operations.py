import json
from datetime import datetime
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sandbox_backend.finance_operations import projection, rules_for, matches


def test_operation_projection_matches_display_and_preserves_amount():
    amount = Decimal('-22.77')
    row = {'operation_date': datetime(2026, 10, 17), 'amount': amount,
           'posting_number': None, 'item_name': 'Услуги Ozon'}
    values = projection(row)
    assert values['operation_date'] == '17.10.2026, 03:00'
    assert values['amount'] == '-22.77'
    assert row['amount'] is amount
    rules = rules_for(json.dumps({'operations': {'label': {'text': 'УСЛУГИ'}, 'amount': {'min': '-23', 'max': '-22,77'}}}))
    assert matches(values, rules)
    assert not matches({**values, 'amount': None}, rules)


def test_column_choices_exclude_own_rule_but_not_other_conditions():
    rules = rules_for('{"operations":{"label":{"values":["A"]},"amount":{"min":"10"}}}')
    assert not matches({'label': 'B', 'amount': 20}, rules)
    assert matches({'label': 'B', 'amount': 20}, rules, exclude='label')
    assert not matches({'label': 'B', 'amount': 5}, rules, exclude='label')
    assert not matches({'label': 'A', 'amount': 20}, rules_for('{"operations":{"label":{"values":[]}}}'))


def test_selected_money_uses_json_display_units_and_keeps_missing_distinct():
    values = projection({'amount': Decimal('12.5000')})
    assert matches(values, rules_for('{"operations":{"amount":{"values":["12.5000"]}}}'))
    assert projection({'amount': Decimal('-0.00')})['amount'] == '0'
    assert matches(projection({'amount': None}), rules_for('{"operations":{"amount":{"values":["__empty__"]}}}'))


@pytest.mark.parametrize('raw', ['{', '[]', '{"operations":[]}', '{"operations":{"secret":{}}}',
    '{"operations":{"amount":{"min":"NaN"}}}', '{"operations":{"amount":{"min":"2","max":"1"}}}',
    '{"operations":{"label":{"min":"2"}}}'])
def test_invalid_operation_filters_fail_closed(raw):
    with pytest.raises(HTTPException) as error:
        rules_for(raw)
    assert error.value.status_code == 422
