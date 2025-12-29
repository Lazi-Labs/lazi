-- ============================================
-- Perfect Catch - Triggers
-- ============================================
-- Run order: 10
-- 
-- Purpose: Automatic data propagation and audit logging
-- ============================================

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RAW → MASTER SYNC TRIGGERS
-- =====================================================

-- Sync customer from raw to master
CREATE OR REPLACE FUNCTION master.sync_customer_from_raw()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.customers (
        st_id, name, type, active, tags, raw_data, created_at, updated_at
    )
    VALUES (
        NEW.st_id,
        NEW.name,
        NEW.type,
        COALESCE(NEW.active, true),
        COALESCE(NEW.tag_type_ids::text[], '{}'),
        NEW.full_data,
        NOW(),
        NOW()
    )
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        active = EXCLUDED.active,
        tags = EXCLUDED.tags,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_raw_customers_to_master
    AFTER INSERT OR UPDATE ON raw.st_customers
    FOR EACH ROW
    EXECUTE FUNCTION master.sync_customer_from_raw();

-- Sync job from raw to master
CREATE OR REPLACE FUNCTION master.sync_job_from_raw()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_name VARCHAR(500);
    v_customer_phone VARCHAR(50);
    v_customer_email VARCHAR(255);
    v_job_type_name VARCHAR(255);
    v_bu_name VARCHAR(255);
    v_campaign_name VARCHAR(255);
BEGIN
    -- Get customer info
    SELECT name, primary_phone, primary_email 
    INTO v_customer_name, v_customer_phone, v_customer_email
    FROM master.customers WHERE st_id = NEW.customer_id;
    
    -- Get job type name
    SELECT name INTO v_job_type_name
    FROM master.job_types WHERE st_id = NEW.job_type_id;
    
    -- Get business unit name
    SELECT name INTO v_bu_name
    FROM master.business_units WHERE st_id = NEW.business_unit_id;
    
    -- Get campaign name
    SELECT name INTO v_campaign_name
    FROM master.campaigns WHERE st_id = NEW.campaign_id;

    INSERT INTO master.jobs (
        st_id, job_number, customer_id, customer_name, customer_phone, customer_email,
        location_id, job_type_id, job_type_name, status, priority, summary,
        business_unit_id, business_unit_name, campaign_id, campaign_name,
        completed_on, total, tags, raw_data, created_at, updated_at
    )
    VALUES (
        NEW.st_id,
        NEW.job_number,
        NEW.customer_id,
        v_customer_name,
        v_customer_phone,
        v_customer_email,
        NEW.location_id,
        NEW.job_type_id,
        v_job_type_name,
        NEW.job_status,
        COALESCE(NEW.priority, 'Normal'),
        NEW.summary,
        NEW.business_unit_id,
        v_bu_name,
        NEW.campaign_id,
        v_campaign_name,
        NEW.completed_on,
        COALESCE(NEW.total, 0),
        COALESCE(NEW.tag_type_ids::text[], '{}'),
        NEW.full_data,
        NOW(),
        NOW()
    )
    ON CONFLICT (st_id) DO UPDATE SET
        job_number = EXCLUDED.job_number,
        customer_id = EXCLUDED.customer_id,
        customer_name = EXCLUDED.customer_name,
        customer_phone = EXCLUDED.customer_phone,
        customer_email = EXCLUDED.customer_email,
        location_id = EXCLUDED.location_id,
        job_type_id = EXCLUDED.job_type_id,
        job_type_name = EXCLUDED.job_type_name,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        summary = EXCLUDED.summary,
        business_unit_id = EXCLUDED.business_unit_id,
        business_unit_name = EXCLUDED.business_unit_name,
        campaign_id = EXCLUDED.campaign_id,
        campaign_name = EXCLUDED.campaign_name,
        completed_on = EXCLUDED.completed_on,
        total = EXCLUDED.total,
        tags = EXCLUDED.tags,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_raw_jobs_to_master
    AFTER INSERT OR UPDATE ON raw.st_jobs
    FOR EACH ROW
    EXECUTE FUNCTION master.sync_job_from_raw();

-- Sync reference data (business units, job types, campaigns, etc.)
CREATE OR REPLACE FUNCTION master.sync_business_unit_from_raw()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.business_units (st_id, name, official_name, email, phone, address, active, updated_at)
    VALUES (NEW.st_id, NEW.name, NEW.official_name, NEW.email, NEW.phone, NEW.address, COALESCE(NEW.active, true), NOW())
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        official_name = EXCLUDED.official_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        active = EXCLUDED.active,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_raw_business_units_to_master
    AFTER INSERT OR UPDATE ON raw.st_business_units
    FOR EACH ROW
    EXECUTE FUNCTION master.sync_business_unit_from_raw();

CREATE OR REPLACE FUNCTION master.sync_job_type_from_raw()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.job_types (st_id, name, duration, priority, business_unit_ids, active, updated_at)
    VALUES (NEW.st_id, NEW.name, NEW.duration, NEW.priority, COALESCE(NEW.business_unit_ids, '{}'), COALESCE(NEW.active, true), NOW())
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        duration = EXCLUDED.duration,
        priority = EXCLUDED.priority,
        business_unit_ids = EXCLUDED.business_unit_ids,
        active = EXCLUDED.active,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_raw_job_types_to_master
    AFTER INSERT OR UPDATE ON raw.st_job_types
    FOR EACH ROW
    EXECUTE FUNCTION master.sync_job_type_from_raw();

CREATE OR REPLACE FUNCTION master.sync_campaign_from_raw()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.campaigns (st_id, name, code, category_id, active, updated_at)
    VALUES (NEW.st_id, NEW.name, NEW.code, NEW.category_id, COALESCE(NEW.active, true), NOW())
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        category_id = EXCLUDED.category_id,
        active = EXCLUDED.active,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_raw_campaigns_to_master
    AFTER INSERT OR UPDATE ON raw.st_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION master.sync_campaign_from_raw();

CREATE OR REPLACE FUNCTION master.sync_technician_from_raw()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.technicians (st_id, name, email, phone, business_unit_id, main_zone_id, zone_ids, active, raw_data, updated_at)
    VALUES (NEW.st_id, NEW.name, NEW.email, NEW.phone, NEW.business_unit_id, NEW.main_zone_id, COALESCE(NEW.zone_ids, '{}'), COALESCE(NEW.active, true), NEW.full_data, NOW())
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        business_unit_id = EXCLUDED.business_unit_id,
        main_zone_id = EXCLUDED.main_zone_id,
        zone_ids = EXCLUDED.zone_ids,
        active = EXCLUDED.active,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_raw_technicians_to_master
    AFTER INSERT OR UPDATE ON raw.st_technicians
    FOR EACH ROW
    EXECUTE FUNCTION master.sync_technician_from_raw();

-- =====================================================
-- AUDIT LOGGING TRIGGERS
-- =====================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit.log_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
    v_record_id VARCHAR(100);
BEGIN
    -- Determine record ID
    IF TG_OP = 'DELETE' THEN
        v_record_id := COALESCE(OLD.id::text, OLD.st_id::text, 'unknown');
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id := COALESCE(NEW.id::text, NEW.st_id::text, 'unknown');
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
    ELSE -- UPDATE
        v_record_id := COALESCE(NEW.id::text, NEW.st_id::text, 'unknown');
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        -- Find changed fields
        SELECT array_agg(key) INTO v_changed_fields
        FROM (
            SELECT key FROM jsonb_each(v_new_data)
            EXCEPT
            SELECT key FROM jsonb_each(v_old_data)
            UNION
            SELECT key FROM jsonb_each(v_old_data) o
            WHERE v_new_data->key IS DISTINCT FROM o.value
        ) changed;
    END IF;
    
    INSERT INTO audit.change_log (
        schema_name, table_name, record_id, operation,
        old_data, new_data, changed_fields, change_source, changed_at
    )
    VALUES (
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_data,
        v_new_data,
        COALESCE(v_changed_fields, '{}'),
        'trigger',
        NOW()
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables (can be expanded)
-- Note: Commented out by default to avoid performance impact during bulk loads
-- Uncomment after initial data load

-- CREATE TRIGGER audit_master_customers
--     AFTER INSERT OR UPDATE OR DELETE ON master.customers
--     FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- CREATE TRIGGER audit_master_jobs
--     AFTER INSERT OR UPDATE OR DELETE ON master.jobs
--     FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- CREATE TRIGGER audit_crm_opportunities
--     AFTER INSERT OR UPDATE OR DELETE ON crm.opportunities
--     FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

-- Master schema
CREATE TRIGGER trg_master_customers_updated
    BEFORE UPDATE ON master.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_master_jobs_updated
    BEFORE UPDATE ON master.jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_master_estimates_updated
    BEFORE UPDATE ON master.estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_master_invoices_updated
    BEFORE UPDATE ON master.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_master_technicians_updated
    BEFORE UPDATE ON master.technicians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CRM schema
CREATE TRIGGER trg_crm_contacts_updated
    BEFORE UPDATE ON crm.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_crm_opportunities_updated
    BEFORE UPDATE ON crm.opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workflow schema
CREATE TRIGGER trg_workflow_definitions_updated
    BEFORE UPDATE ON workflow.definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log completion
DO $$ BEGIN RAISE NOTICE 'Triggers created for all schemas'; END $$;
