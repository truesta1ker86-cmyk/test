"""Exercise the shared report/options contract through real FastAPI validation."""
import asyncio
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI, HTTPException

from app.db import get_session
from app.deps import get_tenant_access
from sandbox_backend import finance_filters, finance_operations, routes


@pytest.fixture
def api(monkeypatch):
    app = FastAPI()
    app.include_router(finance_operations.router)
    app.include_router(finance_filters.router)
    access = SimpleNamespace(tenant=SimpleNamespace(id=4), is_owner=False, role='viewer')
    app.dependency_overrides[get_session] = lambda: object()
    app.dependency_overrides[get_tenant_access] = lambda: access
    async def resolve(request, response, session, expected):
        if expected != 4:
            raise HTTPException(409, 'Магазин изменился')
        response.headers['X-Tenant-Id'] = '4'
        return access
    monkeypatch.setattr(routes.v2_auth, 'resolve', resolve)
    products = [{'offer_id': key, 'name': key, 'category': category, 'product_type': 'T', 'brand': brand}
                for key, category, brand in [('A', 'C1', 'B1'), ('B', 'C2', 'B2')]]
    source = {'data': {'can_manage': True, 'report': {
        'items': [{'offer_id': 'A', 'ozon_accrual': '100', 'profit': '70'},
                  {'offer_id': 'B', 'ozon_accrual': '200', 'profit': '140'}],
        'totals': {'ozon_accrual': '300', 'profit': '210'},
    }}, 'products': products}
    loader = AsyncMock(return_value=source)
    monkeypatch.setattr(finance_filters, 'source_data', loader)
    return app, access, loader, source


def get(api, endpoint, headers=None, **params):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=api[0]), base_url='http://copy') as client:
            return await client.get('/api/workspace-v2/finance/' + endpoint, params=params,
                headers={'X-Expected-Tenant-Id': '4'} if headers is None else headers)
    return asyncio.run(run())


def test_report_and_options_use_identical_selection_across_full_period(api):
    before = deepcopy(api[3])
    params = {'view': 'profit', 'category': 'C1', 'facets': '{"brand":["B1"]}', 'page_size': 1}
    response = get(api, 'report', **params)
    assert response.status_code == 200
    report = response.json()['report']
    assert [row['offer_id'] for row in report['items']] == ['A']
    assert report['totals']['profit'] == '70.00'
    assert report['_filter_scope']['source_products'] == 2
    options = get(api, 'filter-values', **params)
    assert options.status_code == 200
    assert options.json()['fields'] == report['_filter_options']
    assert options.json()['total'] == 1
    assert response.headers['X-Tenant-Id'] == '4'
    assert api[2].call_args.kwargs['tenant'].id == 4
    assert api[3] == before


def test_cached_source_does_not_leak_manager_capability(api):
    assert get(api, 'report').json()['can_manage'] is False
    api[1].role = 'manager'
    assert get(api, 'report').json()['can_manage'] is True
    api[1].role = 'viewer'
    assert get(api, 'report').json()['can_manage'] is False


@pytest.mark.parametrize('endpoint', ['report', 'filter-values'])
def test_expected_tenant_is_required_before_loading_data(api, endpoint):
    assert get(api, endpoint, headers={}).status_code == 428
    assert get(api, endpoint, headers={'X-Expected-Tenant-Id': '5'}).status_code == 409
    api[2].assert_not_called()


@pytest.mark.parametrize('params', [
    {'facets': '{'}, {'facets': '{"brand":"B"}'}, {'facets': '{"unknown":["x"]}'},
    {'column_filters': '[]'}, {'start': '2026-02-30'},
    {'start': '2026-10-18', 'end': '2026-10-01'}, {'page_size': 501}, {'unknown': 'x'},
])
@pytest.mark.parametrize('endpoint', ['report', 'filter-values'])
def test_malformed_query_fails_closed_before_loading_financial_source(api, endpoint, params):
    assert get(api, endpoint, **params).status_code == 422
    api[2].assert_not_called()


def test_zero_matches_is_empty_not_a_fallback_to_all(api):
    report = get(api, 'report', product='not-in-period').json()['report']
    assert report['items'] == []
    assert report['totals']['profit'] == '0.00'
    assert report['_filter_scope']['selected_products'] == 0


@pytest.mark.parametrize('view', ['common', 'accruals', 'operations'])
def test_shop_wide_views_do_not_claim_product_filter_support(api, view):
    response = get(api, 'filter-values', view=view, facets='{"brand":["B1"]}')
    assert response.status_code == 200
    assert response.json()['supported'] is False
    api[2].assert_not_called()
