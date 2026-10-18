-- Run as sandbox_admin in the isolated copy only. Idempotent, additive migration.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'o1c_v2' OR NOT EXISTS (
    SELECT 1 FROM angular_sandbox.control
    WHERE id = 1 AND metadata->>'mode' = 'isolated_db'
      AND metadata->>'integrations_enabled' = 'false'
  ) THEN
    RAISE EXCEPTION 'Pricing views migration requires the isolated test database';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS angular_sandbox.pricing_views (
  id uuid PRIMARY KEY,
  tenant_id integer NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL CHECK (length(trim(name)) > 0),
  query jsonb NOT NULL CHECK (jsonb_typeof(query) = 'object'),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pricing_views_tenant_name
  ON angular_sandbox.pricing_views (tenant_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS pricing_views_tenant_default
  ON angular_sandbox.pricing_views (tenant_id) WHERE is_default;
GRANT SELECT, INSERT, UPDATE, DELETE ON angular_sandbox.pricing_views TO sandbox_app;
COMMIT;
