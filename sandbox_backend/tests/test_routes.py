import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI

from app.db import get_session
from app.deps import get_tenant_access
from sandbox_backend import routes


@pytest.fixture
def api(monkeypatch):
    app = FastAPI()
    app.include_router(routes.router)
    access = SimpleNamespace(tenant=SimpleNamespace(id=4), is_owner=False, role='viewer')
    app.dependency_overrides[get_session] = lambda: object()
    app.dependency_overrides[get_tenant_access] = lambda: access
    async def resolve(request, response, session, expected):
        if expected != 4:
            from fastapi import HTTPException
            raise HTTPException(409, 'Магазин изменился')
        response.headers['X-Tenant-Id'] = '4'
        return access
    monkeypatch.setattr(routes.v2_auth, 'resolve', resolve)
    return app, access


def request(api, method, path, **kwargs):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=api[0]), base_url='http://copy') as client:
            return await client.request(method, '/api/pricing' + path, **kwargs)
    return asyncio.run(run())


def test_column_values_allows_viewers_and_requires_current_tenant(api, monkeypatch):
    rows = [{'offer_id': 'a', 'calculated_price': 100}, {'offer_id': 'b', 'calculated_price': 200}]
    monkeypatch.setattr(routes, 'candidate_rows', AsyncMock(return_value=({}, rows)))
    payload = {'field': 'calculated_price', 'filters': {}}
    response = request(api, 'POST', '/column-values', json=payload, headers={'X-Expected-Tenant-Id': '4'})
    assert response.status_code == 200
    assert response.json() == {'values': ['100', '200']}
    assert response.headers['X-Tenant-Id'] == '4'
    assert request(api, 'POST', '/column-values', json=payload).status_code == 428
    assert request(api, 'POST', '/column-values', json=payload, headers={'X-Expected-Tenant-Id': '5'}).status_code == 409


def test_viewer_cannot_save_or_delete(api, monkeypatch):
    save = AsyncMock()
    monkeypatch.setattr(routes.views, 'save_view', save)
    assert request(api, 'POST', '/views/save', json={'name': 'Тест', 'query': {}}).status_code == 403
    assert request(api, 'POST', '/views/delete', json={'id': 'd3fa07ef-477e-447c-a7c2-c2e315a4f227'}).status_code == 403
    save.assert_not_called()


def test_save_validates_query_before_touching_storage(api, monkeypatch):
    api[1].role = 'manager'
    save = AsyncMock(return_value={'saved': True})
    monkeypatch.setattr(routes.views, 'save_view', save)
    for query in ({'column_filters': 'broken'}, {'sort_by': 'private'}, {'sort_by': []},
                  {'sort_direction': {}}, {'page_size': 999}, {'margin_min': 'NaN'}):
        assert request(api, 'POST', '/views/save', json={'name': 'Тест', 'query': query}).status_code == 422
    save.assert_not_called()
    response = request(api, 'POST', '/views/save', json={'name': ' Тест ', 'query': {'ship_method': '["ПВЗ"]'}, 'default': True})
    assert response.status_code == 200
    assert save.call_args.args[1] == 4
    assert save.call_args.args[2].name == 'Тест'
    assert save.call_args.args[3]['page_size'] == 250
    assert save.call_args.args[3]['ship_method'] == '["ПВЗ"]'


def test_grid_and_selection_share_the_applied_column_filter(api, monkeypatch):
    rows = [{'offer_id': 'b', 'calculated_price': 100}, {'offer_id': 'a', 'calculated_price': 100}]
    selected = AsyncMock(return_value=({}, rows))
    monkeypatch.setattr(routes, 'selected_rows', selected)
    filters = {'column_filters': json.dumps({'calculated_price': {'values': ['100']}})}
    headers = {'X-Expected-Tenant-Id': '4'}
    grid = request(api, 'GET', '/configs', params={**filters, 'page_size': 1}, headers=headers)
    assert grid.json()['total'] == 2
    assert [row['offer_id'] for row in grid.json()['items']] == ['a']
    selection = request(api, 'POST', '/editor/selection', json={'filters': filters}, headers=headers)
    assert selection.json()['total'] == grid.json()['total']
    assert set(selection.json()['offer_ids']) == {'a', 'b'}
    assert selected.call_args.args[2].columns['calculated_price']['values'] == ['100']


@pytest.mark.parametrize('payload', [
    {'field': 'token_hash'}, {'field': 'calculated_price', 'filters': {'unknown': True}},
    {'field': 'calculated_price', 'filters': {'column_filters': '{"name":{"values":null}}'}},
    {'field': 'calculated_price', 'filters': {'conditions': '[{"field":[],"operator":"eq","value":"x"}]'}},
])
def test_invalid_column_requests_fail_closed(api, payload):
    assert request(api, 'POST', '/column-values', json=payload, headers={'X-Expected-Tenant-Id': '4'}).status_code == 422
