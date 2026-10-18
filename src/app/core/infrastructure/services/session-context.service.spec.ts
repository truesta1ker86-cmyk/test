import { SessionContext } from './session-context.service';

describe('Shop context', () => {
  const session = {
    tenant_id: 4,
    name: 'Магазин',
    actor_name: 'Сотрудник',
    role: 'manager',
    is_owner: false,
    expires_in_seconds: 3600,
  };

  it('binds visible data to the authenticated shop', () => {
    const context = new SessionContext();
    context.accept(session);
    expect(context.status()).toBe('ready');
    expect(context.session()?.tenant_id).toBe(4);
  });

  it('removes the session and invalidates pending responses after another tab changes shop', () => {
    const context = new SessionContext();
    context.accept(session);
    const generation = context.generation;
    context.block();
    expect(context.session()).toBeNull();
    expect(context.status()).toBe('changed');
    expect(context.generation).toBeGreaterThan(generation);
  });
});
