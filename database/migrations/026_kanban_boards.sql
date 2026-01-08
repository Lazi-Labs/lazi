-- ============================================
-- Perfect Catch - Kanban Boards Schema
-- ============================================
-- Migration: 026_kanban_boards.sql
-- 
-- Purpose: Generic Kanban board tables for Pipeline and Office views
-- These are separate from crm.opportunities/pipelines which are for sales pipeline
-- ============================================

-- Kanban Boards (containers for columns/tasks)
CREATE TABLE IF NOT EXISTS crm.kanban_boards (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    
    -- Board identity
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,           -- 'pipeline', 'office', etc.
    description TEXT,
    
    -- Board type for different views
    board_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'pipeline', 'office', 'project', 'general'
    
    -- Display settings
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    
    -- Metadata
    settings JSONB DEFAULT '{}',          -- Board-specific settings (colors, etc.)
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, slug)
);

-- Kanban Columns (stages within a board)
CREATE TABLE IF NOT EXISTS crm.kanban_columns (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT NOT NULL REFERENCES crm.kanban_boards(id) ON DELETE CASCADE,
    
    -- Column identity
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',   -- Hex color for column header
    
    -- Position
    display_order INT DEFAULT 0,
    
    -- Column behavior
    is_default BOOLEAN DEFAULT false,     -- New tasks go here by default
    is_completed BOOLEAN DEFAULT false,   -- Tasks here are considered "done"
    wip_limit INT,                         -- Work-in-progress limit (optional)
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kanban Tasks (cards within columns)
CREATE TABLE IF NOT EXISTS crm.kanban_tasks (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT NOT NULL REFERENCES crm.kanban_boards(id) ON DELETE CASCADE,
    column_id BIGINT NOT NULL REFERENCES crm.kanban_columns(id) ON DELETE CASCADE,
    
    -- Task identity
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Priority and status
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    progress INT DEFAULT 0,                -- 0-100 percentage
    
    -- Timing
    due_date DATE,
    start_date DATE,
    completed_at TIMESTAMPTZ,
    
    -- Position within column
    display_order INT DEFAULT 0,
    
    -- Links to other entities (optional)
    contact_id BIGINT REFERENCES crm.contacts(id) ON DELETE SET NULL,
    opportunity_id BIGINT REFERENCES crm.opportunities(id) ON DELETE SET NULL,
    st_job_id BIGINT,                      -- Link to ServiceTitan job
    st_customer_id BIGINT,                 -- Link to ServiceTitan customer
    
    -- Metadata
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Audit
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Assignees (many-to-many: tasks can have multiple assignees)
CREATE TABLE IF NOT EXISTS crm.kanban_task_assignees (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES crm.kanban_tasks(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,               -- References your users table
    
    -- Assignment details
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by BIGINT,
    
    UNIQUE(task_id, user_id)
);

-- Task Comments
CREATE TABLE IF NOT EXISTS crm.kanban_task_comments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES crm.kanban_tasks(id) ON DELETE CASCADE,
    
    -- Comment content
    content TEXT NOT NULL,
    
    -- Author
    user_id BIGINT NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Attachments
CREATE TABLE IF NOT EXISTS crm.kanban_task_attachments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES crm.kanban_tasks(id) ON DELETE CASCADE,
    
    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,                      -- Size in bytes
    
    -- Uploader
    uploaded_by BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Activity Log (for history/audit)
CREATE TABLE IF NOT EXISTS crm.kanban_task_activity (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES crm.kanban_tasks(id) ON DELETE CASCADE,
    
    -- Activity details
    action VARCHAR(50) NOT NULL,           -- 'created', 'moved', 'updated', 'assigned', 'commented'
    old_value JSONB,
    new_value JSONB,
    
    -- Actor
    user_id BIGINT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_kanban_boards_tenant ON crm.kanban_boards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_type ON crm.kanban_boards(board_type);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_slug ON crm.kanban_boards(slug);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON crm.kanban_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_order ON crm.kanban_columns(board_id, display_order);

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_board ON crm.kanban_tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_column ON crm.kanban_tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_priority ON crm.kanban_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_due_date ON crm.kanban_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_contact ON crm.kanban_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_opportunity ON crm.kanban_tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_order ON crm.kanban_tasks(column_id, display_order);

CREATE INDEX IF NOT EXISTS idx_kanban_assignees_task ON crm.kanban_task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_kanban_assignees_user ON crm.kanban_task_assignees(user_id);

CREATE INDEX IF NOT EXISTS idx_kanban_comments_task ON crm.kanban_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_kanban_attachments_task ON crm.kanban_task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_kanban_activity_task ON crm.kanban_task_activity(task_id);

-- ============================================
-- Seed default boards for Pipeline and Office
-- ============================================

-- Note: Run this with your actual tenant_id
-- INSERT INTO crm.kanban_boards (tenant_id, name, slug, board_type, description) VALUES
-- (1, 'Pipeline Board', 'pipeline', 'pipeline', 'Sales and opportunity tracking'),
-- (1, 'Office Board', 'office', 'office', 'Internal office task management');

-- ============================================
-- Updated timestamp trigger
-- ============================================

CREATE OR REPLACE FUNCTION crm.update_kanban_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kanban_boards_updated ON crm.kanban_boards;
CREATE TRIGGER trg_kanban_boards_updated
    BEFORE UPDATE ON crm.kanban_boards
    FOR EACH ROW EXECUTE FUNCTION crm.update_kanban_timestamp();

DROP TRIGGER IF EXISTS trg_kanban_columns_updated ON crm.kanban_columns;
CREATE TRIGGER trg_kanban_columns_updated
    BEFORE UPDATE ON crm.kanban_columns
    FOR EACH ROW EXECUTE FUNCTION crm.update_kanban_timestamp();

DROP TRIGGER IF EXISTS trg_kanban_tasks_updated ON crm.kanban_tasks;
CREATE TRIGGER trg_kanban_tasks_updated
    BEFORE UPDATE ON crm.kanban_tasks
    FOR EACH ROW EXECUTE FUNCTION crm.update_kanban_timestamp();

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Kanban board tables created:';
    RAISE NOTICE '  - crm.kanban_boards (board containers)';
    RAISE NOTICE '  - crm.kanban_columns (stages/columns)';
    RAISE NOTICE '  - crm.kanban_tasks (task cards)';
    RAISE NOTICE '  - crm.kanban_task_assignees (task assignments)';
    RAISE NOTICE '  - crm.kanban_task_comments (task comments)';
    RAISE NOTICE '  - crm.kanban_task_attachments (file attachments)';
    RAISE NOTICE '  - crm.kanban_task_activity (audit log)';
    RAISE NOTICE '============================================';
END $$;
