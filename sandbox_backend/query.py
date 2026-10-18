"""Validate the existing Angular query and compare the canonical pricing rows.

No prices are calculated here: all financial values come from pricing.list_configs.
Percentages are compared in the units displayed by the Angular grid.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from app.services.pricing_shared_filters import PricingSharedFilters
from app.services.calc_engine import CalcEngine

EMPTY = '__empty__'
TEXT = {'offer_id', 'name', 'fin_type', 'ozon_type', 'ship_method', 'plan_ship_method', 'sku_1c'}
RATES = {'effective_margin', 'actual_buyer_margin', 'current_commission', 'fixed_margin',
         'excel_advertising_rate', 'brand_promotion_rate', 'promotion_adjustment_rate'}
NUMERIC = RATES | {'volume', 'units_per_item', 'manual_cost', 'calculated_old_price',
    'calculated_price', 'working_min_price', 'effective_cost', 'actual_cost',
    'current_marketplace_min_price', 'marketplace_expense_base_price', 'effective_logistics',
    'advertising_expense'}
COLUMNS = TEXT | NUMERIC
CONDITION_FIELDS = COLUMNS | {'locked'}
FACETS = {'ozon_type', 'report_category', 'report_type', 'fin_type', 'product_group',
          'brand', 'series', 'length_mm', 'color', 'units_per_item', 'ship_method'}
SORT = {'offer_id', 'name', 'fin_type', 'ozon_type', 'ship_method', 'last_cost', 'last_margin',
        'last_min_price', 'last_price', 'last_old_price', 'last_commission', 'last_logistics', 'updated_at'}
QUERY_STRINGS = FACETS | {'category', 'plan_ship_method', 'search', 'article', 'name',
    'margin_min', 'margin_max', 'promo_below_minimum', 'conditions', 'logic', 'results', 'column_filters'}
QUERY_KEYS = QUERY_STRINGS | {'page', 'page_size', 'sort_by', 'sort_direction'}
OPERATORS = {'eq', 'ne', 'contains', 'not_contains', 'empty', 'not_empty', 'gt', 'gte', 'lt', 'lte'}


def number(value):
    try:
        result = Decimal(str(value).strip().replace(',', '.'))
    except (InvalidOperation, ValueError):
        raise ValueError('Некорректное число')
    if not result.is_finite() or abs(result) > Decimal('1e18') or abs(result.as_tuple().exponent) > 64:
        raise ValueError('Некорректное число')
    return result


def decoded(value, kind):
    try:
        result = json.loads(value) if isinstance(value, str) else value
    except (ValueError, TypeError):
        raise ValueError('Некорректный JSON фильтра')
    if not isinstance(result, kind):
        raise ValueError('Некорректная структура фильтра')
    return result


def selections(value):
    values = decoded(value, list) if isinstance(value, list) or str(value).startswith('[') else [value]
    if len(values) > 5000 or any(not isinstance(v, str) or not v or len(v) > 512 for v in values):
        raise ValueError('Некорректные значения отбора')
    return list(dict.fromkeys(values))


def normalized(value):
    return str(value or '').casefold().replace('ё', 'е')


@dataclass
class Filters:
    raw: dict
    shared: PricingSharedFilters
    columns: dict
    conditions: list
    plan: list
    category: list


def parse_filters(raw):
    if not isinstance(raw, dict) or len(json.dumps(raw, ensure_ascii=False)) > 128000:
        raise ValueError('Слишком большой отбор')
    if set(raw) - QUERY_KEYS - set(PricingSharedFilters.model_fields):
        raise ValueError('Неизвестный фильтр')
    raw = {key: value for key, value in raw.items() if value not in ('', None)}
    if any(not isinstance(v, (str, bool, int, dict, list)) for v in raw.values()):
        raise ValueError('Некорректное значение фильтра')
    for key in QUERY_STRINGS:
        if key in raw and not isinstance(raw[key], (str, bool)):
            raise ValueError('Ожидалась строка фильтра')
    if raw.get('logic', 'all') not in {'all', 'any'} or raw.get('results', 'all') not in {'all', 'failed'}:
        raise ValueError('Неизвестный режим отбора')
    shared = {key: value for key, value in raw.items() if key in PricingSharedFilters.model_fields and key not in FACETS}
    multiple = dict(decoded(shared.pop('filter_values', {}), dict))
    for field in FACETS:
        if field in raw:
            multiple[field] = selections(raw[field])
    if multiple:
        shared['filter_values'] = multiple
    for source, target in [('search', 'product_query'), ('article', 'offer_query'), ('name', 'name_query')]:
        if source in raw:
            shared[target] = raw[source]
    for source, target in [('margin_min', 'target_margin_min'), ('margin_max', 'target_margin_max')]:
        if source in raw:
            shared[target] = number(raw[source]) / 100
    columns = dict(decoded(raw.get('column_filters', '{}'), dict))
    if set(columns) - COLUMNS:
        raise ValueError('Неизвестный столбец')
    for key, rule in columns.items():
        if not isinstance(rule, dict) or set(rule) - {'values', 'text', 'operator', 'min', 'max'}:
            raise ValueError('Некорректный фильтр столбца')
        rule = dict(rule)
        rule['values'] = selections(rule.get('values', []))
        if rule.get('operator', 'contains') not in {'contains', 'not_contains'}:
            raise ValueError('Неизвестный текстовый оператор')
        if not isinstance(rule.get('text', ''), str) or len(rule.get('text', '')) > 512:
            raise ValueError('Слишком длинный текст')
        for bound in ('min', 'max'):
            if rule.get(bound) not in ('', None):
                if key not in NUMERIC:
                    raise ValueError('Диапазон допустим только для чисел')
                rule[bound] = number(rule[bound])
            else:
                rule.pop(bound, None)
        if 'min' in rule and 'max' in rule and rule['min'] > rule['max']:
            raise ValueError('Начало диапазона больше конца')
        if key in NUMERIC:
            rule['values'] = [v if v == EMPTY else format(number(v).normalize(), 'f') for v in rule['values']]
        columns[key] = rule
    conditions = decoded(raw.get('conditions', '[]'), list)
    if len(conditions) > 100:
        raise ValueError('Слишком много условий')
    for condition in conditions:
        if not isinstance(condition, dict) or set(condition) != {'field', 'operator', 'value'}:
            raise ValueError('Некорректное условие')
        field, operator, value = condition['field'], condition['operator'], condition['value']
        if field not in CONDITION_FIELDS or operator not in OPERATORS or not isinstance(value, str) or len(value) > 512:
            raise ValueError('Неизвестное поле или оператор условия')
        if operator not in {'empty', 'not_empty'} and not value.strip():
            raise ValueError('Заполните значение условия')
        if operator in {'gt', 'gte', 'lt', 'lte'}:
            if field not in NUMERIC:
                raise ValueError('Сравнение допустимо только для чисел')
            number(value)
        if field in NUMERIC and operator in {'eq', 'ne'}:
            number(value)
    return Filters(raw, PricingSharedFilters.model_validate(shared), columns, conditions,
                   selections(raw['plan_ship_method']) if 'plan_ship_method' in raw else [],
                   selections(raw['category']) if 'category' in raw else [])


def column_value(row, field):
    value = row.get(field)
    if value is None or value == '':
        return EMPTY
    if field in NUMERIC:
        value = number(value) * (100 if field in RATES else 1)
        return format(value.normalize(), 'f')
    return str(value).lower() if isinstance(value, bool) else str(value)


def condition_matches(row, condition):
    field, operator, expected = condition['field'], condition['operator'], condition['value']
    value = column_value(row, field)
    if operator == 'empty':
        return value == EMPTY
    if operator == 'not_empty':
        return value != EMPTY
    if operator in {'contains', 'not_contains'}:
        contains = normalized(expected) in normalized('' if value == EMPTY else value)
        return contains if operator == 'contains' else not contains
    if value == EMPTY:
        return operator == 'ne'
    left, right = (number(value), number(expected)) if field in NUMERIC else (normalized(value), normalized(expected))
    return {'eq': left == right, 'ne': left != right, 'gt': left > right,
            'gte': left >= right, 'lt': left < right, 'lte': left <= right}[operator]


def matches_row(row, filters, exclude=None):
    if filters.plan:
        plan = column_value(row, 'plan_ship_method')
        # The primary control selects Excel scheme families (FBS/FBO/RFBS),
        # while historical inputs may contain ПВЗ, СЦ, склад or Рфбс.
        if plan not in filters.plan and not any(
            CalcEngine._shipping_scheme(value) is not None
            and CalcEngine._shipping_scheme(value) == CalcEngine._shipping_scheme(plan)
            for value in filters.plan
        ):
            return False
    if filters.raw.get('results') == 'failed' and row.get('last_attempt_ok') is not False:
        return False
    if filters.conditions:
        outcomes = (condition_matches(row, c) for c in filters.conditions)
        if not (any(outcomes) if filters.raw.get('logic') == 'any' else all(outcomes)):
            return False
    for field, rule in filters.columns.items():
        if field == exclude:
            continue
        value = column_value(row, field)
        if rule['values'] and value not in rule['values']:
            return False
        if rule.get('text'):
            contains = normalized(rule['text']) in normalized('' if value == EMPTY else value)
            if contains != (rule.get('operator', 'contains') == 'contains'):
                return False
        if 'min' in rule or 'max' in rule:
            if value == EMPTY or ('min' in rule and number(value) < rule['min']) or ('max' in rule and number(value) > rule['max']):
                return False
    return True


def distinct_values(rows, filters, field):
    if field not in COLUMNS:
        raise ValueError('Неизвестный столбец')
    values = {column_value(row, field) for row in rows if matches_row(row, filters, exclude=field)}
    return sorted(values, key=lambda v: (v == EMPTY, number(v) if field in NUMERIC and v != EMPTY else normalized(v)))
