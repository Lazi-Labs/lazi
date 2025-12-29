-- ============================================
-- Perfect Catch - Index Creation
-- ============================================
-- Run order: 09
-- 
-- Purpose: Performance indexes for all schemas
-- ============================================

-- =====================================================
-- RAW SCHEMA INDEXES
-- =====================================================

-- Customers
CREATE INDEX IF NOT EXISTS idx_raw_customers_st_id ON raw.st_customers(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_customers_modified ON raw.st_customers(modified_on);
CREATE INDEX IF NOT EXISTS idx_raw_customers_active ON raw.st_customers(active);
CREATE INDEX IF NOT EXISTS idx_raw_customers_fetched ON raw.st_customers(fetched_at);

-- Customer Contacts
CREATE INDEX IF NOT EXISTS idx_raw_customer_contacts_customer ON raw.st_customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_raw_customer_contacts_type ON raw.st_customer_contacts(type);

-- Locations
CREATE INDEX IF NOT EXISTS idx_raw_locations_st_id ON raw.st_locations(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_locations_customer ON raw.st_locations(customer_id);

-- Location Contacts
CREATE INDEX IF NOT EXISTS idx_raw_location_contacts_location ON raw.st_location_contacts(location_id);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_raw_jobs_st_id ON raw.st_jobs(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_jobs_customer ON raw.st_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_raw_jobs_location ON raw.st_jobs(location_id);
CREATE INDEX IF NOT EXISTS idx_raw_jobs_status ON raw.st_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_raw_jobs_modified ON raw.st_jobs(modified_on);
CREATE INDEX IF NOT EXISTS idx_raw_jobs_number ON raw.st_jobs(job_number);

-- Appointments
CREATE INDEX IF NOT EXISTS idx_raw_appointments_st_id ON raw.st_appointments(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_appointments_job ON raw.st_appointments(job_id);
CREATE INDEX IF NOT EXISTS idx_raw_appointments_start ON raw.st_appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_raw_appointments_status ON raw.st_appointments(status);

-- Appointment Assignments
CREATE INDEX IF NOT EXISTS idx_raw_appt_assign_appt ON raw.st_appointment_assignments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_raw_appt_assign_tech ON raw.st_appointment_assignments(technician_id);

-- Estimates
CREATE INDEX IF NOT EXISTS idx_raw_estimates_st_id ON raw.st_estimates(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_estimates_job ON raw.st_estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_raw_estimates_customer ON raw.st_estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_raw_estimates_status ON raw.st_estimates(status);
CREATE INDEX IF NOT EXISTS idx_raw_estimates_modified ON raw.st_estimates(modified_on);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_raw_invoices_st_id ON raw.st_invoices(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_invoices_job ON raw.st_invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_raw_invoices_customer ON raw.st_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_raw_invoices_due_date ON raw.st_invoices(due_date);

-- Payments
CREATE INDEX IF NOT EXISTS idx_raw_payments_st_id ON raw.st_payments(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_payments_customer ON raw.st_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_raw_payments_invoice ON raw.st_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_raw_payments_date ON raw.st_payments(payment_date);

-- Technicians
CREATE INDEX IF NOT EXISTS idx_raw_technicians_st_id ON raw.st_technicians(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_technicians_active ON raw.st_technicians(active);
CREATE INDEX IF NOT EXISTS idx_raw_technicians_bu ON raw.st_technicians(business_unit_id);

-- Pricebook
CREATE INDEX IF NOT EXISTS idx_raw_pb_categories_st_id ON raw.st_pricebook_categories(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_pb_categories_parent ON raw.st_pricebook_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_raw_pb_materials_st_id ON raw.st_pricebook_materials(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_pb_materials_code ON raw.st_pricebook_materials(code);
CREATE INDEX IF NOT EXISTS idx_raw_pb_materials_active ON raw.st_pricebook_materials(active);
CREATE INDEX IF NOT EXISTS idx_raw_pb_services_st_id ON raw.st_pricebook_services(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_pb_services_code ON raw.st_pricebook_services(code);
CREATE INDEX IF NOT EXISTS idx_raw_pb_services_active ON raw.st_pricebook_services(active);
CREATE INDEX IF NOT EXISTS idx_raw_pb_equipment_st_id ON raw.st_pricebook_equipment(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_pb_equipment_code ON raw.st_pricebook_equipment(code);

-- =====================================================
-- MASTER SCHEMA INDEXES
-- =====================================================

-- Customers
CREATE INDEX IF NOT EXISTS idx_master_customers_st_id ON master.customers(st_id);
CREATE INDEX IF NOT EXISTS idx_master_customers_name ON master.customers(name);
CREATE INDEX IF NOT EXISTS idx_master_customers_email ON master.customers(primary_email);
CREATE INDEX IF NOT EXISTS idx_master_customers_phone ON master.customers(primary_phone);
CREATE INDEX IF NOT EXISTS idx_master_customers_active ON master.customers(active);
CREATE INDEX IF NOT EXISTS idx_master_customers_search ON master.customers USING gin(to_tsvector('english', name));

-- Jobs
CREATE INDEX IF NOT EXISTS idx_master_jobs_st_id ON master.jobs(st_id);
CREATE INDEX IF NOT EXISTS idx_master_jobs_customer ON master.jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_master_jobs_status ON master.jobs(status);
CREATE INDEX IF NOT EXISTS idx_master_jobs_scheduled ON master.jobs(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_master_jobs_number ON master.jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_master_jobs_technicians ON master.jobs USING gin(technician_ids);

-- Estimates
CREATE INDEX IF NOT EXISTS idx_master_estimates_st_id ON master.estimates(st_id);
CREATE INDEX IF NOT EXISTS idx_master_estimates_customer ON master.estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_master_estimates_job ON master.estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_master_estimates_status ON master.estimates(status);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_master_invoices_st_id ON master.invoices(st_id);
CREATE INDEX IF NOT EXISTS idx_master_invoices_customer ON master.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_master_invoices_job ON master.invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_master_invoices_balance ON master.invoices(balance) WHERE balance > 0;

-- Technicians
CREATE INDEX IF NOT EXISTS idx_master_technicians_st_id ON master.technicians(st_id);
CREATE INDEX IF NOT EXISTS idx_master_technicians_active ON master.technicians(active);

-- Pricebook Items
CREATE INDEX IF NOT EXISTS idx_master_pricebook_st_id ON master.pricebook_items(st_id);
CREATE INDEX IF NOT EXISTS idx_master_pricebook_type ON master.pricebook_items(item_type);
CREATE INDEX IF NOT EXISTS idx_master_pricebook_code ON master.pricebook_items(code);
CREATE INDEX IF NOT EXISTS idx_master_pricebook_active ON master.pricebook_items(active);
CREATE INDEX IF NOT EXISTS idx_master_pricebook_search ON master.pricebook_items USING gin(to_tsvector('english', display_name || ' ' || COALESCE(description, '')));

-- =====================================================
-- CRM SCHEMA INDEXES
-- =====================================================

-- Contacts
CREATE INDEX IF NOT EXISTS idx_crm_contacts_st_customer ON crm.contacts(st_customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner ON crm.contacts(owner_id);

-- Opportunities
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_contact ON crm.opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_pipeline ON crm.opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm.opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_status ON crm.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_st_job ON crm.opportunities(st_job_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_st_estimate ON crm.opportunities(st_estimate_id);

-- Activities
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity ON crm.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm.activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_scheduled ON crm.activities(scheduled_at);

-- Pipeline Stages
CREATE INDEX IF NOT EXISTS idx_crm_stages_pipeline ON crm.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_stages_order ON crm.pipeline_stages(pipeline_id, display_order);

-- =====================================================
-- WORKFLOW SCHEMA INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_workflow_stage_actions_stage ON workflow.stage_actions(stage_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow.executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow.executions(status);

-- =====================================================
-- SYNC SCHEMA INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sync_outbound_status ON sync.outbound_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_outbound_scheduled ON sync.outbound_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sync_outbound_entity ON sync.outbound_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_inbound_started ON sync.inbound_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_inbound_status ON sync.inbound_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_entity_hashes ON sync.entity_hashes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync.conflicts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync.conflicts(status);

-- =====================================================
-- AUDIT SCHEMA INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_audit_change_table ON audit.change_log(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_change_record ON audit.change_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_change_time ON audit.change_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_api_path ON audit.api_log(path);
CREATE INDEX IF NOT EXISTS idx_audit_api_time ON audit.api_log(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_error_type ON audit.error_log(error_type);
CREATE INDEX IF NOT EXISTS idx_audit_error_time ON audit.error_log(occurred_at DESC);

-- Log completion
DO $$ BEGIN RAISE NOTICE 'Indexes created for all schemas'; END $$;
