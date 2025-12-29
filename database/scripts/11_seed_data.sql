-- ============================================
-- Perfect Catch - Seed Data
-- ============================================
-- Run order: 11
-- 
-- Purpose: Initial seed data for pipelines and templates
-- ============================================

-- Default Sales Pipeline
INSERT INTO crm.pipelines (name, description, entity_type, active, display_order)
VALUES ('Sales Pipeline', 'Default sales pipeline for pool service opportunities', 'opportunity', true, 1)
ON CONFLICT DO NOTHING;

-- Default Pipeline Stages
INSERT INTO crm.pipeline_stages (pipeline_id, name, color, display_order, is_won, is_lost, probability_percent)
SELECT 
    p.id,
    stage.name,
    stage.color,
    stage.display_order,
    stage.is_won,
    stage.is_lost,
    stage.probability_percent
FROM crm.pipelines p
CROSS JOIN (VALUES
    ('New Lead', '#3B82F6', 1, false, false, 10),
    ('Contacted', '#8B5CF6', 2, false, false, 20),
    ('Estimate Scheduled', '#F59E0B', 3, false, false, 40),
    ('Estimate Sent', '#10B981', 4, false, false, 60),
    ('Negotiation', '#EC4899', 5, false, false, 80),
    ('Won', '#22C55E', 6, true, false, 100),
    ('Lost', '#EF4444', 7, false, true, 0)
) AS stage(name, color, display_order, is_won, is_lost, probability_percent)
WHERE p.name = 'Sales Pipeline'
ON CONFLICT DO NOTHING;

-- Default Messaging Templates
INSERT INTO workflow.messaging_templates (name, description, channel, subject_template, body_template, required_variables, category)
VALUES 
    ('appointment_reminder_sms', 'SMS reminder for upcoming appointment', 'sms', NULL, 
     'Hi {{customer_name}}, this is a reminder that your pool service appointment is scheduled for {{appointment_date}} at {{appointment_time}}. Reply STOP to opt out.',
     '["customer_name", "appointment_date", "appointment_time"]'::jsonb, 'appointment'),
    
    ('estimate_followup_sms', 'Follow up on sent estimate', 'sms', NULL,
     'Hi {{customer_name}}, just following up on the estimate we sent for {{estimate_name}}. Let us know if you have any questions! - Perfect Catch Pools',
     '["customer_name", "estimate_name"]'::jsonb, 'sales'),
    
    ('job_completed_sms', 'Notification when job is completed', 'sms', NULL,
     'Hi {{customer_name}}, your pool service has been completed! Thank you for choosing Perfect Catch Pools. Questions? Reply to this message.',
     '["customer_name"]'::jsonb, 'service'),
    
    ('appointment_confirmation_email', 'Email confirmation for scheduled appointment', 'email', 
     'Your Pool Service Appointment is Confirmed',
     'Dear {{customer_name}},\n\nYour appointment has been scheduled for:\n\nDate: {{appointment_date}}\nTime: {{appointment_time}}\nService: {{job_type}}\n\nOur technician {{technician_name}} will arrive during your scheduled window.\n\nThank you,\nPerfect Catch Pools',
     '["customer_name", "appointment_date", "appointment_time", "job_type", "technician_name"]'::jsonb, 'appointment'),
    
    ('estimate_sent_email', 'Email when estimate is sent to customer', 'email',
     'Your Pool Service Estimate from Perfect Catch Pools',
     'Dear {{customer_name}},\n\nThank you for your interest in our services. Please find your estimate attached.\n\nEstimate: {{estimate_name}}\nTotal: ${{estimate_total}}\n\nThis estimate is valid for 30 days. Please let us know if you have any questions.\n\nBest regards,\nPerfect Catch Pools',
     '["customer_name", "estimate_name", "estimate_total"]'::jsonb, 'sales')
ON CONFLICT (name) DO NOTHING;

-- Initialize sync state for all raw tables
INSERT INTO raw.sync_state (table_name, endpoint, sync_status)
VALUES 
    ('st_customers', '/crm/v2/customers', 'pending'),
    ('st_customer_contacts', '/crm/v2/customers/contacts', 'pending'),
    ('st_locations', '/crm/v2/locations', 'pending'),
    ('st_location_contacts', '/crm/v2/locations/contacts', 'pending'),
    ('st_jobs', '/jpm/v2/jobs', 'pending'),
    ('st_appointments', '/jpm/v2/appointments', 'pending'),
    ('st_estimates', '/sales/v2/estimates', 'pending'),
    ('st_invoices', '/accounting/v2/invoices', 'pending'),
    ('st_payments', '/accounting/v2/payments', 'pending'),
    ('st_technicians', '/settings/v2/technicians', 'pending'),
    ('st_employees', '/settings/v2/employees', 'pending'),
    ('st_business_units', '/settings/v2/business-units', 'pending'),
    ('st_campaigns', '/settings/v2/campaigns', 'pending'),
    ('st_job_types', '/jpm/v2/job-types', 'pending'),
    ('st_tag_types', '/settings/v2/tag-types', 'pending'),
    ('st_zones', '/dispatch/v2/zones', 'pending'),
    ('st_teams', '/dispatch/v2/teams', 'pending'),
    ('st_pricebook_categories', '/pricebook/v2/categories', 'pending'),
    ('st_pricebook_materials', '/pricebook/v2/materials', 'pending'),
    ('st_pricebook_services', '/pricebook/v2/services', 'pending'),
    ('st_pricebook_equipment', '/pricebook/v2/equipment', 'pending'),
    ('st_installed_equipment', '/equipmentsystems/v2/installed-equipment', 'pending')
ON CONFLICT (table_name) DO NOTHING;

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Perfect Catch Database Setup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Schemas: raw, master, crm, workflow, sync, audit';
    RAISE NOTICE 'Ready for ServiceTitan API sync';
    RAISE NOTICE '============================================';
END $$;
