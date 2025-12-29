-- ============================================
-- Perfect Catch - Extensions Setup
-- ============================================
-- Run order: 01
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Log completion
DO $$ BEGIN RAISE NOTICE 'Extensions created: uuid-ossp, pg_trgm, btree_gin, vector'; END $$;
