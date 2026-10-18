"""Persist pricing views separately from catalog views, always scoped by tenant."""
import json
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


def output(row):
    return {'id': str(row['id']), 'name': row['name'], 'query': row['query'], 'default': row['is_default']}


async def list_views(session, tenant_id):
    rows = (await session.execute(text('''SELECT id,name,query,is_default FROM angular_sandbox.pricing_views
        WHERE tenant_id=:tenant ORDER BY lower(name),id'''), {'tenant': tenant_id})).mappings().all()
    return {'items': [output(row) for row in rows]}


async def save_view(session, tenant_id, request, query):
    params = {'tenant': tenant_id, 'id': request.id or uuid4(), 'name': request.name.strip(),
              'query': json.dumps(query, ensure_ascii=False), 'default': request.default}
    try:
        # Serialize all saves for one shop, including competing default changes.
        await session.execute(text('SELECT pg_advisory_xact_lock(21092, :tenant)'), {'tenant': tenant_id})
        if request.id:
            found = await session.scalar(text('SELECT id FROM angular_sandbox.pricing_views WHERE tenant_id=:tenant AND id=:id'), params)
            if found is None:
                raise HTTPException(404, 'Отбор не найден в текущем магазине.')
        if request.default:
            await session.execute(text('UPDATE angular_sandbox.pricing_views SET is_default=false WHERE tenant_id=:tenant AND is_default'), params)
        sql = ('''UPDATE angular_sandbox.pricing_views SET name=:name,query=CAST(:query AS jsonb),
                  is_default=:default,updated_at=now() WHERE tenant_id=:tenant AND id=:id'''
               if request.id else '''INSERT INTO angular_sandbox.pricing_views(id,tenant_id,name,query,is_default)
                  VALUES (:id,:tenant,:name,CAST(:query AS jsonb),:default)''')
        row = (await session.execute(text(sql + ' RETURNING id,name,query,is_default'), params)).mappings().one()
        await session.commit()
        return output(row)
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(409, 'Отбор с таким названием уже существует.') from error


async def delete_view(session, tenant_id, view_id):
    await session.execute(text('SELECT pg_advisory_xact_lock(21092, :tenant)'), {'tenant': tenant_id})
    deleted = await session.scalar(text('DELETE FROM angular_sandbox.pricing_views WHERE tenant_id=:tenant AND id=:id RETURNING id'),
                                   {'tenant': tenant_id, 'id': view_id})
    if deleted is None:
        raise HTTPException(404, 'Отбор не найден в текущем магазине.')
    await session.commit()
    return {'deleted': True}
