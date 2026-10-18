"""Financial product selection, independent of pricing formulas and costs."""
import json
from collections import Counter
from typing import Literal

from pydantic import Field, model_validator
from app.schemas.finance_v2 import FinanceQuery as BaseQuery
from app.services.product_facets import infer_product_facets

PRODUCT_VIEWS = {'profit', 'gross', 'weekly', 'market'}
FACETS = {'report_category', 'report_type', 'brand', 'series', 'color', 'length_mm', 'product_group', 'fin_type'}
EMPTY = '__empty__'


class FinanceQuery(BaseQuery):
    page_size: int = Field(50, ge=1, le=500)
    category: str = Field('', max_length=256)
    product_type: str = Field('', max_length=256)
    product: str = Field('', max_length=128)
    article: str = Field('', max_length=200)
    facets: str = Field('{}', max_length=64000)
    column_filters: str = Field('{}', max_length=128000)

    @model_validator(mode='after')
    def selections(self):
        facets = json.loads(self.facets or '{}')
        if not isinstance(facets, dict) or set(facets) - FACETS:
            raise ValueError('Неизвестная характеристика финансового отбора')
        for values in facets.values():
            if not isinstance(values, list) or len(values) > 5000 or any(
                    not isinstance(v, str) or not v or len(v) > 512 for v in values):
                raise ValueError('Некорректные значения характеристики')
        columns = json.loads(self.column_filters or '{}')
        if not isinstance(columns, dict) or any(not isinstance(v, dict) for v in columns.values()):
            raise ValueError('Некорректные условия столбцов')
        return self

    def product_active(self):
        return bool(self.category or self.product_type or self.product or self.article
                    or any(json.loads(self.facets or '{}').values()))


def normalized(value):
    return str(value or '').strip().casefold().replace('ё', 'е')


def scalar(value):
    return str(value) if value is not None and value != '' else EMPTY


def articles_for(view, report):
    if view in {'profit', 'market'}:
        return report.get('items', [])
    if view == 'weekly' and 'article_rows' in report:
        return report['article_rows']
    return [{**article, 'category': group.get('category'), 'product_type': group.get('product_type')}
            for group in report.get('rows', []) for article in group.get('articles', [])]


def common(row):
    return not row.get('offer_id') or any(row.get(k) for k in ('is_common', 'is_rounding', 'is_unallocated'))


def metadata_for(view, report, catalog, groups):
    result = {}
    for row in articles_for(view, report):
        if common(row):
            continue
        offer = str(row['offer_id'])
        saved = catalog.get(offer, {})
        name = row.get('product_name') or row.get('name') or saved.get('name') or offer
        inferred = infer_product_facets(name=name, brand=None, attributes_raw=None)
        category, kind = groups.get(offer, ('Без категории', 'Без типа'))
        category = row.get('report_category') or row.get('category') or category
        kind = row.get('report_type') or row.get('product_type') or kind
        values = {'offer_id': offer, 'name': name, 'category': category, 'product_type': kind,
                  'report_category': category, 'report_type': kind}
        for field in FACETS - {'report_category', 'report_type'}:
            inferred_value = getattr(inferred, 'group' if field == 'product_group' else field, None)
            alias = 'filter_group' if field == 'product_group' else 'filter_' + field
            values[field] = row.get(field, row.get(alias, saved.get(field, inferred_value)))
            if values[field] is not None:
                values[field] = str(values[field])
        result[offer] = values
    return sorted(result.values(), key=lambda r: (normalized(r['name']), r['offer_id']))


def matches_product(record, query, skip=frozenset()):
    if query.category and 'category' not in skip and record.get('category') != query.category:
        return False
    if query.product_type and 'product_type' not in skip and record.get('product_type') != query.product_type:
        return False
    if query.product and 'product' not in skip and record.get('offer_id') != query.product:
        return False
    if query.article and normalized(query.article) not in normalized(record.get('offer_id')):
        return False
    searchable = normalized(' '.join(str(record.get(k) or '') for k in
        ('offer_id', 'name', 'category', 'product_type', 'brand', 'series', 'color', 'product_group', 'fin_type')))
    if any(term not in searchable for term in normalized(query.q).split()):
        return False
    return all(not values or key in skip or scalar(record.get(key)) in values
               for key, values in json.loads(query.facets or '{}').items())


def filter_options(products, query):
    options = {}
    for field in ['category', 'product_type', 'product', *sorted(FACETS)]:
        skip = {'category', 'product_type', 'product'} if field == 'category' else (
            {'product_type', 'product'} if field == 'product_type' else {field})
        found = [p for p in products if matches_product(p, query, skip)]
        key = 'offer_id' if field == 'product' else field
        counts = Counter(scalar(p.get(key)) for p in found)
        labels = {p['offer_id']: p['name'] + ' · ' + p['offer_id'] for p in found}
        options[field] = [{'value': value, 'label': labels[value] if field == 'product' else (
            '(Пусто / нет данных)' if value == EMPTY else value), 'count': counts[value]}
            for value in sorted(counts, key=lambda v: (v == EMPTY, normalized(v)))]
    return options
