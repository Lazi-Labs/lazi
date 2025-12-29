-- ============================================
-- Perfect Catch - Schema Creation
-- ============================================
-- Run order: 02
-- 
-- Schema purposes:
--   raw      - Immutable ServiceTitan API data (exact copies)
--   master   - Merged/computed entities (denormalized for speed)
--   crm      - Custom CRM tables (NOT Payload - that stays separate)
--   workflow - Automation configurations and execution
--   sync     - Queue state and sync tracking
--   audit    - Change history and logging
-- ============================================

-- Create schemas
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS master;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS sync;
CREATE SCHEMA IF NOT EXISTS audit;

-- Add comments
COMMENT ON SCHEMA raw IS 'Immutable ServiceTitan API data - exact JSON copies with typed columns';
COMMENT ON SCHEMA master IS 'Merged/computed entities - denormalized for fast queries';
COMMENT ON SCHEMA crm IS 'Custom CRM tables - contacts, opportunities, pipelines (NOT Payload)';
COMMENT ON SCHEMA workflow IS 'Automation configurations - workflows, stage actions, field mappings';
COMMENT ON SCHEMA sync IS 'Queue state and sync tracking - outbound queue, inbound logs';
COMMENT ON SCHEMA audit IS 'Change history and logging - all schema changes tracked';

-- Grant permissions to postgres user
GRANT ALL ON SCHEMA raw TO postgres;
GRANT ALL ON SCHEMA master TO postgres;
GRANT ALL ON SCHEMA crm TO postgres;
GRANT ALL ON SCHEMA workflow TO postgres;
GRANT ALL ON SCHEMA sync TO postgres;
GRANT ALL ON SCHEMA audit TO postgres;

-- Set default search path
ALTER DATABASE perfectcatch SET search_path TO public, raw, master, crm, workflow, sync, audit;

-- Log completion
DO $$ 
BEGIN 
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Schemas created:';
  RAISE NOTICE '  - raw (ServiceTitan API data)';
  RAISE NOTICE '  - master (merged entities)';
  RAISE NOTICE '  - crm (custom CRM tables)';
  RAISE NOTICE '  - workflow (automation)';
  RAISE NOTICE '  - sync (queue state)';
  RAISE NOTICE '  - audit (change history)';
  RAISE NOTICE '============================================';
END $$;
