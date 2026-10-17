import { SessionContext } from './session-context';
describe('Database copy mode', () => {
  it('requires an explicit server session marker and clears it on logout', () => {
    const context = new SessionContext();
    const session = {
      tenant_id: 4,
      name: 'Shop',
      actor_name: 'Owner',
      role: 'owner',
      is_owner: true,
      expires_in_seconds: 3600,
    };
    context.accept(session);
    expect(context.databaseCopy()).toBe(false);
    context.accept({ ...session, data_mode: 'sandbox_db', external_integrations_enabled: false });
    expect(context.databaseCopy()).toBe(true);
    context.signOut();
    expect(context.databaseCopy()).toBe(false);
  });
});
