-- ============================================================
-- TRIGGER FUNCTIONS: Raw → Master Sync
-- Phase 3: Automatic data propagation
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- sync_customer_to_master()
-- Triggered by: raw.st_customers INSERT/UPDATE
-- Merges: customers + contacts + primary location
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_customer_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_primary_email VARCHAR(255);
    v_primary_phone VARCHAR(50);
    v_phone_numbers JSONB;
    v_email_addresses JSONB;
    v_location RECORD;
BEGIN
    -- Get primary email (most recent Email type contact)
    SELECT value INTO v_primary_email
    FROM raw.st_customer_contacts
    WHERE customer_id = NEW.st_id AND type = 'Email'
    ORDER BY st_modified_on DESC NULLS LAST
    LIMIT 1;
    
    -- Get primary phone (prefer MobilePhone, then Phone)
    SELECT value INTO v_primary_phone
    FROM raw.st_customer_contacts
    WHERE customer_id = NEW.st_id AND type IN ('Phone', 'MobilePhone')
    ORDER BY 
        CASE WHEN type = 'MobilePhone' THEN 0 ELSE 1 END,
        st_modified_on DESC NULLS LAST
    LIMIT 1;
    
    -- Get all phone numbers as JSONB array
    SELECT jsonb_agg(jsonb_build_object(
        'type', type,
        'value', value,
        'settings', phone_settings
    ))
    INTO v_phone_numbers
    FROM raw.st_customer_contacts
    WHERE customer_id = NEW.st_id AND type IN ('Phone', 'MobilePhone');
    
    -- Get all email addresses as JSONB array
    SELECT jsonb_agg(value)
    INTO v_email_addresses
    FROM raw.st_customer_contacts
    WHERE customer_id = NEW.st_id AND type = 'Email';
    
    -- Get primary location
    SELECT 
        st_id,
        address->>'street' as street,
        address->>'unit' as unit,
        address->>'city' as city,
        address->>'state' as state,
        address->>'zip' as zip,
        address->>'country' as country,
        (address->>'latitude')::DECIMAL as latitude,
        (address->>'longitude')::DECIMAL as longitude
    INTO v_location
    FROM raw.st_locations
    WHERE customer_id = NEW.st_id AND active = true
    ORDER BY st_created_on ASC
    LIMIT 1;
    
    -- Upsert into master.customers
    INSERT INTO master.customers (
        st_id, name, type, active, balance,
        email, phone, phone_numbers, email_addresses,
        primary_location_id, address_line1, address_line2,
        city, state, zip, country, latitude, longitude,
        do_not_mail, do_not_service,
        tag_type_ids, custom_fields,
        st_created_on, st_modified_on, synced_at,
        raw_data
    ) VALUES (
        NEW.st_id, NEW.name, NEW.type, NEW.active, NEW.balance,
        v_primary_email, v_primary_phone, v_phone_numbers, v_email_addresses,
        v_location.st_id, v_location.street, v_location.unit,
        v_location.city, v_location.state, v_location.zip, v_location.country,
        v_location.latitude, v_location.longitude,
        NEW.do_not_mail, NEW.do_not_service,
        NEW.tag_type_ids, NEW.custom_fields,
        NEW.st_created_on, NEW.st_modified_on, NOW(),
        NEW.full_data
    )
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        active = EXCLUDED.active,
        balance = EXCLUDED.balance,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        phone_numbers = EXCLUDED.phone_numbers,
        email_addresses = EXCLUDED.email_addresses,
        primary_location_id = EXCLUDED.primary_location_id,
        address_line1 = EXCLUDED.address_line1,
        address_line2 = EXCLUDED.address_line2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip = EXCLUDED.zip,
        country = EXCLUDED.country,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        do_not_mail = EXCLUDED.do_not_mail,
        do_not_service = EXCLUDED.do_not_service,
        tag_type_ids = EXCLUDED.tag_type_ids,
        custom_fields = EXCLUDED.custom_fields,
        st_modified_on = EXCLUDED.st_modified_on,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_customer_contacts_to_master()
-- Triggered by: raw.st_customer_contacts INSERT/UPDATE
-- Re-syncs the parent customer when contacts change
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_customer_contacts_to_master()
RETURNS TRIGGER AS $$
BEGIN
    -- Trigger customer resync by touching the customer record
    UPDATE raw.st_customers
    SET fetched_at = NOW()
    WHERE st_id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_location_to_master()
-- Triggered by: raw.st_locations INSERT/UPDATE
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_location_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_email VARCHAR(255);
    v_phone VARCHAR(50);
BEGIN
    -- Get contact info
    SELECT value INTO v_email
    FROM raw.st_location_contacts
    WHERE location_id = NEW.st_id AND type = 'Email'
    LIMIT 1;
    
    SELECT value INTO v_phone
    FROM raw.st_location_contacts
    WHERE location_id = NEW.st_id AND type IN ('Phone', 'MobilePhone')
    LIMIT 1;
    
    INSERT INTO master.locations (
        st_id, customer_id, name, active,
        street, unit, city, state, zip, country, latitude, longitude,
        email, phone, zone_id, tax_zone_id,
        tag_type_ids, custom_fields,
        st_created_on, st_modified_on, synced_at, raw_data
    ) VALUES (
        NEW.st_id, NEW.customer_id, NEW.name, NEW.active,
        NEW.address->>'street', NEW.address->>'unit',
        NEW.address->>'city', NEW.address->>'state',
        NEW.address->>'zip', NEW.address->>'country',
        (NEW.address->>'latitude')::DECIMAL, (NEW.address->>'longitude')::DECIMAL,
        v_email, v_phone, NEW.zone_id, NEW.tax_zone_id,
        NEW.tag_type_ids, NEW.custom_fields,
        NEW.st_created_on, NEW.st_modified_on, NOW(), NEW.full_data
    )
    ON CONFLICT (st_id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        name = EXCLUDED.name,
        active = EXCLUDED.active,
        street = EXCLUDED.street,
        unit = EXCLUDED.unit,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip = EXCLUDED.zip,
        country = EXCLUDED.country,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        zone_id = EXCLUDED.zone_id,
        tax_zone_id = EXCLUDED.tax_zone_id,
        tag_type_ids = EXCLUDED.tag_type_ids,
        custom_fields = EXCLUDED.custom_fields,
        st_modified_on = EXCLUDED.st_modified_on,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data;
    
    -- Also update customer's primary location if this is their first/only location
    UPDATE raw.st_customers
    SET fetched_at = NOW()
    WHERE st_id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_location_contacts_to_master()
-- Triggered by: raw.st_location_contacts INSERT/UPDATE
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_location_contacts_to_master()
RETURNS TRIGGER AS $$
BEGIN
    -- Trigger location resync
    UPDATE raw.st_locations
    SET fetched_at = NOW()
    WHERE st_id = NEW.location_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_job_to_master()
-- Triggered by: raw.st_jobs INSERT/UPDATE
-- Merges: jobs + appointments + technician assignments
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_job_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_appointment RECORD;
    v_primary_tech_id BIGINT;
    v_primary_tech_name VARCHAR(255);
    v_tech_ids BIGINT[];
    v_sold_by_name VARCHAR(255);
BEGIN
    -- Get latest appointment times
    SELECT 
        start_time, end_time,
        arrival_window_start, arrival_window_end
    INTO v_appointment
    FROM raw.st_appointments
    WHERE job_id = NEW.st_id AND active = true
    ORDER BY start_time DESC
    LIMIT 1;
    
    -- Get technician assignments for this job's appointments
    SELECT 
        array_agg(DISTINCT aa.technician_id),
        (array_agg(aa.technician_id ORDER BY aa.assigned_on ASC))[1]
    INTO v_tech_ids, v_primary_tech_id
    FROM raw.st_appointments a
    JOIN raw.st_appointment_assignments aa ON aa.appointment_id = a.st_id
    WHERE a.job_id = NEW.st_id;
    
    -- Get primary technician name
    IF v_primary_tech_id IS NOT NULL THEN
        SELECT name INTO v_primary_tech_name
        FROM raw.st_technicians
        WHERE st_id = v_primary_tech_id;
    END IF;
    
    -- Get sold_by name
    IF NEW.sold_by_id IS NOT NULL THEN
        SELECT name INTO v_sold_by_name
        FROM raw.st_employees
        WHERE st_id = NEW.sold_by_id;
        
        -- Fallback to technicians if not found in employees
        IF v_sold_by_name IS NULL THEN
            SELECT name INTO v_sold_by_name
            FROM raw.st_technicians
            WHERE st_id = NEW.sold_by_id;
        END IF;
    END IF;
    
    -- Upsert into master.jobs
    INSERT INTO master.jobs (
        st_id, job_number, customer_id, location_id,
        business_unit_id, job_type_id, campaign_id,
        job_status, priority, summary, total,
        scheduled_start, scheduled_end,
        arrival_window_start, arrival_window_end,
        completed_on,
        primary_technician_id, primary_technician_name, technician_ids,
        sold_by_id, sold_by_name, created_from_estimate_id,
        tag_type_ids, custom_fields,
        st_created_on, st_modified_on, synced_at,
        raw_data
    ) VALUES (
        NEW.st_id, NEW.job_number, NEW.customer_id, NEW.location_id,
        NEW.business_unit_id, NEW.job_type_id, NEW.campaign_id,
        NEW.job_status, NEW.priority, NEW.summary, NEW.total,
        v_appointment.start_time, v_appointment.end_time,
        v_appointment.arrival_window_start, v_appointment.arrival_window_end,
        NEW.completed_on,
        v_primary_tech_id, v_primary_tech_name, v_tech_ids,
        NEW.sold_by_id, v_sold_by_name, NEW.created_from_estimate_id,
        NEW.tag_type_ids, NEW.custom_fields,
        NEW.st_created_on, NEW.st_modified_on, NOW(),
        NEW.full_data
    )
    ON CONFLICT (st_id) DO UPDATE SET
        job_number = EXCLUDED.job_number,
        customer_id = EXCLUDED.customer_id,
        location_id = EXCLUDED.location_id,
        business_unit_id = EXCLUDED.business_unit_id,
        job_type_id = EXCLUDED.job_type_id,
        campaign_id = EXCLUDED.campaign_id,
        job_status = EXCLUDED.job_status,
        priority = EXCLUDED.priority,
        summary = EXCLUDED.summary,
        total = EXCLUDED.total,
        scheduled_start = EXCLUDED.scheduled_start,
        scheduled_end = EXCLUDED.scheduled_end,
        arrival_window_start = EXCLUDED.arrival_window_start,
        arrival_window_end = EXCLUDED.arrival_window_end,
        completed_on = EXCLUDED.completed_on,
        primary_technician_id = EXCLUDED.primary_technician_id,
        primary_technician_name = EXCLUDED.primary_technician_name,
        technician_ids = EXCLUDED.technician_ids,
        sold_by_id = EXCLUDED.sold_by_id,
        sold_by_name = EXCLUDED.sold_by_name,
        created_from_estimate_id = EXCLUDED.created_from_estimate_id,
        tag_type_ids = EXCLUDED.tag_type_ids,
        custom_fields = EXCLUDED.custom_fields,
        st_modified_on = EXCLUDED.st_modified_on,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_appointment_to_master()
-- Triggered by: raw.st_appointments INSERT/UPDATE
-- Re-syncs the parent job when appointments change
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_appointment_to_master()
RETURNS TRIGGER AS $$
BEGIN
    -- Trigger job resync
    UPDATE raw.st_jobs
    SET fetched_at = NOW()
    WHERE st_id = NEW.job_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_appointment_assignment_to_master()
-- Triggered by: raw.st_appointment_assignments INSERT/UPDATE
-- Re-syncs the parent job when assignments change
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_appointment_assignment_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_job_id BIGINT;
BEGIN
    -- Get the job_id from the appointment
    SELECT job_id INTO v_job_id
    FROM raw.st_appointments
    WHERE st_id = NEW.appointment_id;
    
    -- Trigger job resync
    IF v_job_id IS NOT NULL THEN
        UPDATE raw.st_jobs
        SET fetched_at = NOW()
        WHERE st_id = v_job_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_invoice_to_master()
-- Triggered by: raw.st_invoices INSERT/UPDATE
-- Merges: invoices + payment summary
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_invoice_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_paid_amount DECIMAL(18,4);
    v_payment_count INT;
    v_last_payment TIMESTAMPTZ;
    v_customer_name VARCHAR(500);
    v_job_number VARCHAR(50);
BEGIN
    -- Calculate payment summary from applied_to JSONB
    SELECT 
        COALESCE(SUM(
            (SELECT COALESCE(SUM((a->>'appliedAmount')::DECIMAL), 0)
             FROM jsonb_array_elements(p.applied_to) a 
             WHERE (a->>'appliedId')::BIGINT = NEW.st_id)
        ), 0),
        COUNT(*),
        MAX(p.payment_date)
    INTO v_paid_amount, v_payment_count, v_last_payment
    FROM raw.st_payments p
    WHERE p.active = true;
    
    -- Get customer name from JSONB
    v_customer_name := NEW.customer->>'name';
    
    -- Get job number from JSONB
    v_job_number := NEW.job->>'number';
    
    -- Upsert into master.invoices
    INSERT INTO master.invoices (
        st_id, reference_number, invoice_date, due_date, invoice_type,
        subtotal, sales_tax, total, balance,
        paid_amount, payment_count, last_payment_date,
        customer_id, customer_name, location_id,
        job_id, job_number, business_unit_id,
        items, active, sync_status,
        st_created_on, st_modified_on, synced_at,
        raw_data
    ) VALUES (
        NEW.st_id, NEW.reference_number, NEW.invoice_date, NEW.due_date, NEW.invoice_type,
        NEW.subtotal, NEW.sales_tax, NEW.total, NEW.balance,
        v_paid_amount, v_payment_count, v_last_payment,
        (NEW.customer->>'id')::BIGINT, v_customer_name,
        (NEW.location->>'id')::BIGINT,
        (NEW.job->>'id')::BIGINT, v_job_number,
        (NEW.business_unit->>'id')::BIGINT,
        NEW.items, NEW.active, NEW.sync_status,
        NEW.st_created_on, NEW.st_modified_on, NOW(),
        NEW.full_data
    )
    ON CONFLICT (st_id) DO UPDATE SET
        reference_number = EXCLUDED.reference_number,
        invoice_date = EXCLUDED.invoice_date,
        due_date = EXCLUDED.due_date,
        invoice_type = EXCLUDED.invoice_type,
        subtotal = EXCLUDED.subtotal,
        sales_tax = EXCLUDED.sales_tax,
        total = EXCLUDED.total,
        balance = EXCLUDED.balance,
        paid_amount = EXCLUDED.paid_amount,
        payment_count = EXCLUDED.payment_count,
        last_payment_date = EXCLUDED.last_payment_date,
        customer_id = EXCLUDED.customer_id,
        customer_name = EXCLUDED.customer_name,
        location_id = EXCLUDED.location_id,
        job_id = EXCLUDED.job_id,
        job_number = EXCLUDED.job_number,
        business_unit_id = EXCLUDED.business_unit_id,
        items = EXCLUDED.items,
        active = EXCLUDED.active,
        sync_status = EXCLUDED.sync_status,
        st_modified_on = EXCLUDED.st_modified_on,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_payment_to_master()
-- Triggered by: raw.st_payments INSERT/UPDATE
-- Re-syncs related invoices when payments change
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_payment_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id BIGINT;
BEGIN
    -- Update all invoices that this payment applies to
    FOR v_invoice_id IN 
        SELECT (a->>'appliedId')::BIGINT
        FROM jsonb_array_elements(COALESCE(NEW.applied_to, '[]'::jsonb)) a
        WHERE (a->>'appliedId') IS NOT NULL
    LOOP
        UPDATE raw.st_invoices
        SET fetched_at = NOW()
        WHERE st_id = v_invoice_id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_estimate_to_master()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_estimate_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_name VARCHAR(500);
    v_sold_by_name VARCHAR(255);
    v_item_count INT;
    v_status VARCHAR(50);
BEGIN
    -- Get customer name
    SELECT name INTO v_customer_name
    FROM raw.st_customers
    WHERE st_id = NEW.customer_id;
    
    -- Get sold_by name (check employees first, then technicians)
    IF NEW.sold_by IS NOT NULL THEN
        SELECT name INTO v_sold_by_name
        FROM raw.st_employees
        WHERE st_id = NEW.sold_by;
        
        IF v_sold_by_name IS NULL THEN
            SELECT name INTO v_sold_by_name
            FROM raw.st_technicians
            WHERE st_id = NEW.sold_by;
        END IF;
    END IF;
    
    -- Count items
    v_item_count := jsonb_array_length(COALESCE(NEW.items, '[]'::jsonb));
    
    -- Extract status name - parse as JSON if it looks like JSON
    IF NEW.status IS NOT NULL AND NEW.status LIKE '{%' THEN
        v_status := (NEW.status::jsonb)->>'name';
    ELSE
        v_status := NEW.status;
    END IF;
    
    -- Upsert
    INSERT INTO master.estimates (
        st_id, name, job_number, status, review_status, summary,
        subtotal, tax,
        customer_id, customer_name, location_id, job_id, project_id,
        business_unit_id,
        sold_on, sold_by_id, sold_by_name,
        items, item_count, active,
        st_created_on, st_modified_on, synced_at,
        raw_data
    ) VALUES (
        NEW.st_id, NEW.name, NEW.job_number, v_status, NEW.review_status, NEW.summary,
        NEW.subtotal, NEW.tax,
        NEW.customer_id, v_customer_name, NEW.location_id, NEW.job_id, NEW.project_id,
        NEW.business_unit_id,
        NEW.sold_on, NEW.sold_by, v_sold_by_name,
        NEW.items, v_item_count, NEW.active,
        NEW.st_created_on, NEW.st_modified_on, NOW(),
        NEW.full_data
    )
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        job_number = EXCLUDED.job_number,
        status = EXCLUDED.status,
        review_status = EXCLUDED.review_status,
        summary = EXCLUDED.summary,
        subtotal = EXCLUDED.subtotal,
        tax = EXCLUDED.tax,
        customer_id = EXCLUDED.customer_id,
        customer_name = EXCLUDED.customer_name,
        location_id = EXCLUDED.location_id,
        job_id = EXCLUDED.job_id,
        project_id = EXCLUDED.project_id,
        business_unit_id = EXCLUDED.business_unit_id,
        sold_on = EXCLUDED.sold_on,
        sold_by_id = EXCLUDED.sold_by_id,
        sold_by_name = EXCLUDED.sold_by_name,
        items = EXCLUDED.items,
        item_count = EXCLUDED.item_count,
        active = EXCLUDED.active,
        st_modified_on = EXCLUDED.st_modified_on,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_technician_to_master()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_technician_to_master()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.technicians (
        st_id, name, email, phone, login_name,
        business_unit_id, main_zone_id, zone_ids, role_ids,
        daily_goal, burden_rate, active, is_managed_tech,
        st_created_on, st_modified_on, synced_at, raw_data
    ) VALUES (
        NEW.st_id, NEW.name, NEW.email, NEW.phone, NEW.login_name,
        NEW.business_unit_id, NEW.main_zone_id, NEW.zone_ids, NEW.role_ids,
        NEW.daily_goal, NEW.burden_rate, NEW.active, NEW.is_managed_tech,
        NEW.st_created_on, NEW.st_modified_on, NOW(), NEW.full_data
    )
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        login_name = EXCLUDED.login_name,
        business_unit_id = EXCLUDED.business_unit_id,
        main_zone_id = EXCLUDED.main_zone_id,
        zone_ids = EXCLUDED.zone_ids,
        role_ids = EXCLUDED.role_ids,
        daily_goal = EXCLUDED.daily_goal,
        burden_rate = EXCLUDED.burden_rate,
        active = EXCLUDED.active,
        is_managed_tech = EXCLUDED.is_managed_tech,
        st_modified_on = EXCLUDED.st_modified_on,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_business_unit_to_master()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_business_unit_to_master()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.business_units (
        st_id, name, official_name, email, phone, active, address, trade, raw_data, synced_at
    ) VALUES (
        NEW.st_id, NEW.name, NEW.official_name, NEW.email, NEW.phone, 
        NEW.active, NEW.address, NEW.trade, NEW.full_data, NOW()
    )
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        official_name = EXCLUDED.official_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        active = EXCLUDED.active,
        address = EXCLUDED.address,
        trade = EXCLUDED.trade,
        raw_data = EXCLUDED.raw_data,
        synced_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_job_type_to_master()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_job_type_to_master()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.job_types (
        st_id, name, duration, priority, active, raw_data, synced_at
    ) VALUES (
        NEW.st_id, NEW.name, NEW.duration, NEW.priority, NEW.active, NEW.full_data, NOW()
    )
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        duration = EXCLUDED.duration,
        priority = EXCLUDED.priority,
        active = EXCLUDED.active,
        raw_data = EXCLUDED.raw_data,
        synced_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- sync_campaign_to_master()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raw.sync_campaign_to_master()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.campaigns (
        st_id, name, code, category_id, active, raw_data, synced_at
    ) VALUES (
        NEW.st_id, NEW.name, NEW.code, NEW.category_id, NEW.active, NEW.full_data, NOW()
    )
    ON CONFLICT (st_id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        category_id = EXCLUDED.category_id,
        active = EXCLUDED.active,
        raw_data = EXCLUDED.raw_data,
        synced_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- ATTACH TRIGGERS TO RAW TABLES
-- ============================================================

-- Customers
DROP TRIGGER IF EXISTS trg_sync_customer_to_master ON raw.st_customers;
CREATE TRIGGER trg_sync_customer_to_master
    AFTER INSERT OR UPDATE ON raw.st_customers
    FOR EACH ROW EXECUTE FUNCTION raw.sync_customer_to_master();

-- Customer contacts (triggers customer resync)
DROP TRIGGER IF EXISTS trg_sync_customer_contacts ON raw.st_customer_contacts;
CREATE TRIGGER trg_sync_customer_contacts
    AFTER INSERT OR UPDATE ON raw.st_customer_contacts
    FOR EACH ROW EXECUTE FUNCTION raw.sync_customer_contacts_to_master();

-- Locations
DROP TRIGGER IF EXISTS trg_sync_location_to_master ON raw.st_locations;
CREATE TRIGGER trg_sync_location_to_master
    AFTER INSERT OR UPDATE ON raw.st_locations
    FOR EACH ROW EXECUTE FUNCTION raw.sync_location_to_master();

-- Location contacts
DROP TRIGGER IF EXISTS trg_sync_location_contacts ON raw.st_location_contacts;
CREATE TRIGGER trg_sync_location_contacts
    AFTER INSERT OR UPDATE ON raw.st_location_contacts
    FOR EACH ROW EXECUTE FUNCTION raw.sync_location_contacts_to_master();

-- Jobs
DROP TRIGGER IF EXISTS trg_sync_job_to_master ON raw.st_jobs;
CREATE TRIGGER trg_sync_job_to_master
    AFTER INSERT OR UPDATE ON raw.st_jobs
    FOR EACH ROW EXECUTE FUNCTION raw.sync_job_to_master();

-- Appointments (triggers job resync)
DROP TRIGGER IF EXISTS trg_sync_appointment ON raw.st_appointments;
CREATE TRIGGER trg_sync_appointment
    AFTER INSERT OR UPDATE ON raw.st_appointments
    FOR EACH ROW EXECUTE FUNCTION raw.sync_appointment_to_master();

-- Appointment assignments (triggers job resync)
DROP TRIGGER IF EXISTS trg_sync_appointment_assignment ON raw.st_appointment_assignments;
CREATE TRIGGER trg_sync_appointment_assignment
    AFTER INSERT OR UPDATE ON raw.st_appointment_assignments
    FOR EACH ROW EXECUTE FUNCTION raw.sync_appointment_assignment_to_master();

-- Invoices
DROP TRIGGER IF EXISTS trg_sync_invoice_to_master ON raw.st_invoices;
CREATE TRIGGER trg_sync_invoice_to_master
    AFTER INSERT OR UPDATE ON raw.st_invoices
    FOR EACH ROW EXECUTE FUNCTION raw.sync_invoice_to_master();

-- Payments (triggers invoice resync)
DROP TRIGGER IF EXISTS trg_sync_payment ON raw.st_payments;
CREATE TRIGGER trg_sync_payment
    AFTER INSERT OR UPDATE ON raw.st_payments
    FOR EACH ROW EXECUTE FUNCTION raw.sync_payment_to_master();

-- Estimates
DROP TRIGGER IF EXISTS trg_sync_estimate_to_master ON raw.st_estimates;
CREATE TRIGGER trg_sync_estimate_to_master
    AFTER INSERT OR UPDATE ON raw.st_estimates
    FOR EACH ROW EXECUTE FUNCTION raw.sync_estimate_to_master();

-- Technicians
DROP TRIGGER IF EXISTS trg_sync_technician_to_master ON raw.st_technicians;
CREATE TRIGGER trg_sync_technician_to_master
    AFTER INSERT OR UPDATE ON raw.st_technicians
    FOR EACH ROW EXECUTE FUNCTION raw.sync_technician_to_master();

-- Business Units
DROP TRIGGER IF EXISTS trg_sync_business_unit_to_master ON raw.st_business_units;
CREATE TRIGGER trg_sync_business_unit_to_master
    AFTER INSERT OR UPDATE ON raw.st_business_units
    FOR EACH ROW EXECUTE FUNCTION raw.sync_business_unit_to_master();

-- Job Types
DROP TRIGGER IF EXISTS trg_sync_job_type_to_master ON raw.st_job_types;
CREATE TRIGGER trg_sync_job_type_to_master
    AFTER INSERT OR UPDATE ON raw.st_job_types
    FOR EACH ROW EXECUTE FUNCTION raw.sync_job_type_to_master();

-- Campaigns
DROP TRIGGER IF EXISTS trg_sync_campaign_to_master ON raw.st_campaigns;
CREATE TRIGGER trg_sync_campaign_to_master
    AFTER INSERT OR UPDATE ON raw.st_campaigns
    FOR EACH ROW EXECUTE FUNCTION raw.sync_campaign_to_master();
