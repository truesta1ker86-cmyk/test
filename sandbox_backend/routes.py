from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db import get_session
from app.deps import get_tenant_access
from app.routes import pricing_v2_editor as editor
from app.schemas.product_bulk import ProductBulkChanges
from app.services import v2_auth
from sandbox_backend import views
from sandbox_backend.query import QUERY_KEYS, QUERY_STRINGS, SORT, parse_filters, distinct_values
from sandbox_backend.selection import candidate_rows, selected_rows, page_result

router = APIRouter(prefix='/api/pricing', tags=['sandbox-pricing-filters'])


async def read_access(request: Request, response: Response, session=Depends(get_session)):
    # A column-values POST is a read. Validate the same signed copy session and
    # expected shop as GETs, without incorrectly requiring a manager role.
    expected = request.headers.get('x-expected-tenant-id', '')
    if not expected.isdecimal() or len(expected) > 10 or int(expected) < 1:
        raise HTTPException(428, 'Сначала загрузите текущий магазин.')
    return await v2_auth.resolve(request, response, session, int(expected))


async def write_access(access=Depends(get_tenant_access)):
    if not access.is_owner and access.role != 'manager':
        raise HTTPException(403, 'Недостаточно прав для изменения данных.')
    return access


def validated(raw):
    try:
        return parse_filters(raw)
    except (ValueError, TypeError, AttributeError, ArithmeticError) as error:
        raise HTTPException(422, 'Некорректный отбор товаров.') from error


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')


class ViewSave(Strict):
    id: Optional[UUID] = None
    name: str = Field(min_length=1, max_length=120)
    query: dict
    default: bool = False

    @field_validator('name')
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Введите название отбора')
        return value


class ViewDelete(Strict):
    id: UUID


class ColumnValues(Strict):
    field: str = Field(min_length=1, max_length=64)
    filters: dict = Field(default_factory=dict)


def saved_query(raw):
    if set(raw) - QUERY_KEYS:
        raise HTTPException(422, 'Неизвестное поле сохранённого отбора.')
    validated(raw)
    query = {key: '' for key in QUERY_STRINGS}
    query.update(logic='all', results='all', page=1, page_size=250, sort_by='offer_id', sort_direction='asc')
    query.update(raw)
    try:
        query['page'] = int(query['page'])
        query['page_size'] = int(query['page_size'])
    except (ValueError, TypeError):
        raise HTTPException(422, 'Некорректная страница.')
    if (not 1 <= query['page'] <= 1000000 or query['page_size'] not in {25, 50, 100, 200, 250, 500}
            or not isinstance(query['sort_by'], str) or query['sort_by'] not in SORT
            or not isinstance(query['sort_direction'], str) or query['sort_direction'] not in {'asc', 'desc'}
            or any(not isinstance(query[key], str) for key in QUERY_STRINGS)):
        raise HTTPException(422, 'Некорректные параметры отбора.')
    return query


@router.get('/views')
async def get_views(access=Depends(read_access), session=Depends(get_session)):
    return await views.list_views(session, access.tenant.id)


@router.post('/views/save')
async def save_view(req: ViewSave, access=Depends(write_access), session=Depends(get_session)):
    return await views.save_view(session, access.tenant.id, req, saved_query(req.query))


@router.post('/views/delete')
async def delete_view(req: ViewDelete, access=Depends(write_access), session=Depends(get_session)):
    return await views.delete_view(session, access.tenant.id, req.id)


@router.post('/column-values')
async def column_values(req: ColumnValues, access=Depends(read_access), session=Depends(get_session)):
    from sandbox_backend.query import COLUMNS
    if req.field not in COLUMNS:
        raise HTTPException(422, 'Неизвестный столбец цен.')
    filters = validated(req.filters)
    _, rows = await candidate_rows(session, access.tenant, filters)
    return {'values': distinct_values(rows, filters, req.field)}


@router.get('/configs')
async def configs(request: Request, page: int = Query(1, ge=1, le=1000000),
                  page_size: int = Query(250, ge=1, le=500),
                  access=Depends(read_access), session=Depends(get_session)):
    raw = dict(request.query_params)
    sort_by, direction = raw.get('sort_by', 'offer_id'), raw.get('sort_direction', 'asc')
    if sort_by not in SORT or direction not in {'asc', 'desc'}:
        raise HTTPException(422, 'Некорректная сортировка.')
    data, rows = await selected_rows(session, access.tenant, validated(raw))
    return page_result(data, rows, page, page_size, sort_by, direction)


class Scope(Strict):
    offer_ids: Optional[list[str]] = Field(None, min_length=1, max_length=10000)
    filters: dict = Field(default_factory=dict)


class Recalculate(Strict):
    scope: Scope
    skip_locked: bool = True


class Preview(Strict):
    scope: Scope
    changes: ProductBulkChanges
    include_locked: bool = False


async def scope_offers(session, tenant, scope):
    if scope.offer_ids is not None:
        return await editor.selected(session, tenant.id, editor.Scope(offer_ids=scope.offer_ids))
    _, rows = await selected_rows(session, tenant, validated(scope.filters))
    if len(rows) > 10000:
        raise HTTPException(422, 'Уточните отбор: выбрано больше 10000 товаров.')
    return [row['offer_id'] for row in rows]


@router.post('/editor/selection')
async def selection(req: Scope, access=Depends(read_access), session=Depends(get_session)):
    offers = await scope_offers(session, access.tenant, req)
    return {'offer_ids': offers, 'total': len(offers)}


@router.post('/editor/recalc')
async def recalculate(req: Recalculate, access=Depends(write_access), session=Depends(get_session)):
    offers = await scope_offers(session, access.tenant, req.scope)
    if not offers:
        return {'total': 0, 'recalculated': 0, 'failed': 0, 'errors': [], 'message': 'Товаров по фильтру нет.'}
    return await editor.recalculate(editor.Recalculate(scope=editor.Scope(offer_ids=offers), skip_locked=req.skip_locked), access.tenant, session)


@router.post('/editor/preview')
async def preview(req: Preview, access=Depends(write_access), session=Depends(get_session)):
    offers = await scope_offers(session, access.tenant, req.scope)
    if not offers:
        raise HTTPException(422, 'Нет товаров для изменения.')
    return await editor.preview(editor.Preview(scope=editor.Scope(offer_ids=offers), changes=req.changes,
                                              include_locked=req.include_locked), access.tenant, session)
