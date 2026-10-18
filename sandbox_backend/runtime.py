"""Add exact local routes to the existing deny-by-default sandbox runtime."""
from contextlib import asynccontextmanager

from sqlalchemy import text

from sandbox import runtime as base
from app.db import async_session_factory
from sandbox_backend.routes import router
from sandbox_backend.finance_operations import router as finance_operations_router
from sandbox_backend.finance_filters import router as finance_filters_router

app = base.app
original_allowed = base.allowed
EXTRA = {('GET', '/api/pricing/views'), ('POST', '/api/pricing/views/save'),
         ('POST', '/api/pricing/views/delete'), ('POST', '/api/pricing/column-values'),
         ('GET', '/api/workspace-v2/finance/filter-values')}


def allowed(method, path):
    return (method, path) in EXTRA or original_allowed(method, path)


base.allowed = allowed
original_lifespan = app.router.lifespan_context


@asynccontextmanager
async def lifespan(application):
    async with original_lifespan(application):
        async with async_session_factory() as session:
            await session.execute(text('SELECT id FROM angular_sandbox.pricing_views LIMIT 0'))
        yield


app.router.lifespan_context = lifespan
# Mount before the legacy handlers with the same paths, retaining every existing
# middleware, dependency override, outbound ban and startup isolation assertion.
before = len(app.router.routes)
app.include_router(router)
app.include_router(finance_operations_router)
app.include_router(finance_filters_router)
app.router.routes[:] = app.router.routes[before:] + app.router.routes[:before]
