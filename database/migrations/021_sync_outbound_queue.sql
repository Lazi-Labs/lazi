-- Migration: 021_sync_outbound_queue
-- Description: Outbound sync queue for tracking changes to push to ServiceTitan

CREATE TABLE IF NOT EXISTS sync_outbound_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    payload JSONB,
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_outbound_queue_status ON sync_outbound_queue(status);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_scheduled ON sync_outbound_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbound_queue_entity ON sync_outbound_queue(entity_type, entity_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_outbound_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS trigger_outbound_queue_timestamp ON sync_outbound_queue;
CREATE TRIGGER trigger_outbound_queue_timestamp
    BEFORE UPDATE ON sync_outbound_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_outbound_queue_timestamp();

COMMENT ON TABLE sync_outbound_queue IS 'Queue for outbound sync operations to ServiceTitan';
