"""Real PostgreSQL checks. Run through docker exec in the sandbox API only."""
import asyncio
from types import SimpleNamespace
from uuid import uuid4, UUID

from fastapi import HTTPException
from sqlalchemy import text
from app.db import async_session_factory
from sandbox_backend import views


async def main():
    async with async_session_factory() as session:
        assert await session.scalar(text('SELECT current_database()')) == 'o1c_v2'
        mode = await session.scalar(text("SELECT metadata->>'mode' FROM angular_sandbox.control WHERE id=1"))
        assert mode == 'isolated_db'
        tenant_id = 4
        originals = (await views.list_views(session, tenant_id))['items']
        original_default = next((v for v in originals if v['default']), None)
    prefix = 'Проверка параллельных отборов ' + uuid4().hex
    ids = []

    async def save(index):
        async with async_session_factory() as session:
            saved = await views.save_view(session, tenant_id,
                SimpleNamespace(id=None, name=f'{prefix} {index}', default=True), {})
            ids.append(saved['id'])

    try:
        await asyncio.gather(save(1), save(2))
        async with async_session_factory() as session:
            saved = (await views.list_views(session, tenant_id))['items']
            assert len([v for v in saved if v['default']]) == 1
            foreign_tenant = 999999
            assert (await views.list_views(session, foreign_tenant))['items'] == []
            for operation in ('update', 'delete'):
                try:
                    if operation == 'update':
                        await views.save_view(session, foreign_tenant,
                            SimpleNamespace(id=UUID(ids[0]), name=prefix, default=True), {})
                    else:
                        await views.delete_view(session, foreign_tenant, UUID(ids[0]))
                    raise AssertionError('Cross-tenant mutation succeeded')
                except HTTPException as error:
                    assert error.status_code == 404
                    await session.rollback()
            assert len([v for v in (await views.list_views(session, tenant_id))['items'] if v['id'] in ids]) == 2
        print('PostgreSQL: concurrent defaults and cross-tenant list/update/delete OK', flush=True)
    finally:
        async with async_session_factory() as session:
            for view_id in ids:
                await views.delete_view(session, tenant_id, UUID(view_id))
            if original_default:
                await views.save_view(session, tenant_id, SimpleNamespace(
                    id=UUID(original_default['id']), name=original_default['name'], default=True), original_default['query'])


asyncio.run(main())
