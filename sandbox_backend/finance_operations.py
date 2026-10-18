"""Read-only column selection before pagination of copied finance operations."""
import json
from datetime import timezone
from decimal import Decimal
from typing import Optional, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select, or_

from app.db import get_session
from app.models.finance import FinanceOperation
from app.routes import finance_v2, analytics
from sandbox_backend.finance_selection import FinanceQuery, PRODUCT_VIEWS
from sandbox_backend.query import number
from sandbox_backend.routes import read_access

router = APIRouter()
FIELDS = {'label', 'operation_date', 'posting_number', 'operation_type', 'amount'}
ROW_FIELDS = ['id', 'posting_id', 'posting_number', 'operation_type', 'transaction_type',
              'amount', 'currency', 'operation_date', 'item_name']


class Rule(BaseModel):
    model_config = ConfigDict(extra='forbid')
    values: Optional[list[str]] = Field(None, max_length=50000)
    text: str = Field('', max_length=512)
    operator: Literal['contains', 'not_contains'] = 'contains'
    min: str = ''
    max: str = ''

    @model_validator(mode='after')
    def bounds(self):
        if self.min:
            number(self.min)
        if self.max:
            number(self.max)
        if self.min and self.max and number(self.min) > number(self.max):
            raise ValueError('Начало диапазона больше конца')
        return self


def rules_for(raw):
    try:
        if len(raw) > 128000:
            raise ValueError()
        views = json.loads(raw or '{}')
        if not isinstance(views, dict) or not isinstance(views.get('operations', {}), dict):
            raise ValueError()
        rules = {key: Rule.model_validate(value) for key, value in views.get('operations', {}).items()}
        if set(rules) - FIELDS or any((rule.min or rule.max) and key != 'amount' for key, rule in rules.items()):
            raise ValueError()
        if 'amount' in rules and rules['amount'].values is not None:
            rules['amount'].values = [value if value == '__empty__' else scalar_amount(value)
                                      for value in rules['amount'].values]
        return rules
    except (ValueError, TypeError, ArithmeticError) as error:
        raise HTTPException(422, 'Некорректный отбор финансовых операций.') from error


def scalar_amount(value):
    value = number(value)
    return '0' if value == 0 else format(value.normalize(), 'f')


def projection(row):
    timestamp = row.get('operation_date')
    if timestamp is not None:
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        timestamp = timestamp.astimezone(ZoneInfo('Europe/Moscow')).strftime('%d.%m.%Y, %H:%M')
    return {'label': row.get('item_name') or 'Общие операции Ozon',
            'operation_date': timestamp, 'posting_number': row.get('posting_number'),
            'operation_type': row.get('operation_type'),
            'amount': scalar_amount(row['amount']) if row.get('amount') is not None else None}


def matches(values, rules, exclude=None):
    for field, rule in rules.items():
        if field == exclude:
            continue
        value = values.get(field)
        text = '' if value is None else str(value)
        if rule.values is not None and (text or '__empty__') not in rule.values:
            return False
        if rule.text:
            found = rule.text.strip().casefold() in text.casefold()
            if found != (rule.operator == 'contains'):
                return False
        if rule.min or rule.max:
            if value is None or (rule.min and number(value) < number(rule.min)) or (rule.max and number(value) > number(rule.max)):
                return False
    return True


@router.get('/api/workspace-v2/finance/report')
async def report(request: Request, access=Depends(read_access), session=Depends(get_session)):
    from sandbox_backend.finance_filters import finance_query, product_report
    query = await finance_query(request)
    if query.view in PRODUCT_VIEWS:
        return await product_report(query, access, session)
    if query.view != 'operations':
        return await finance_v2.report(query, access, session)
    rules = rules_for(request.query_params.get('column_filters', '{}'))
    finance_v2.validate_period(query)
    since, until = analytics._calendar_period(default_days=30, from_=query.start or None, to=query.end or None)
    conditions = [FinanceOperation.tenant_id == access.tenant.id,
                  FinanceOperation.operation_date >= since, FinanceOperation.operation_date <= until]
    if query.q:
        conditions.append(or_(FinanceOperation.posting_number.ilike('%' + query.q + '%'),
                              FinanceOperation.item_name.ilike('%' + query.q + '%')))
    if query.operation_type:
        conditions.append(FinanceOperation.operation_type == query.operation_type)
    source = (await session.scalars(select(FinanceOperation).where(*conditions)
        .order_by(FinanceOperation.operation_date.desc(), FinanceOperation.id.desc()))).all()
    rows = [{key: getattr(row, key) for key in ROW_FIELDS} for row in source]
    projected = [(row, projection(row)) for row in rows]
    selected = [row for row, values in projected if matches(values, rules)]
    result = await finance_v2.report(query, access, session)
    start = (query.page - 1) * query.page_size
    options = {field: sorted({str(values[field]) if values[field] is not None else '__empty__'
        for _, values in projected if matches(values, rules, exclude=field)}) for field in FIELDS}
    result['report'].update(items=selected[start:start + query.page_size], total=len(selected),
        amount=str(sum((row['amount'] or Decimal(0) for row in selected), Decimal(0))),
        has_more=start + query.page_size < len(selected), _column_options=options, _filters_applied=True)
    return result
