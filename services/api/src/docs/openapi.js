/**
 * OpenAPI/Swagger Documentation
 * API specification for Perfect Catch CRM
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Perfect Catch CRM API',
    description: 'REST API for Perfect Catch CRM - ServiceTitan integration and standalone CRM',
    version: '1.0.0',
    contact: {
      name: 'Perfect Catch Development',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Base URL',
    },
  ],
  tags: [
    { name: 'Health', description: 'Health and status endpoints' },
    { name: 'CRM - Contacts', description: 'CRM contact management' },
    { name: 'CRM - Opportunities', description: 'Sales opportunity management' },
    { name: 'CRM - Pipelines', description: 'Pipeline and stage management' },
    { name: 'CRM - Tasks', description: 'Task management' },
    { name: 'Workflows', description: 'Workflow automation' },
    { name: 'Audit', description: 'Audit logs and history' },
    { name: 'Cache', description: 'Cache management' },
  ],
  paths: {
    // Health endpoints
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Basic health check',
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check',
        description: 'Verifies all dependencies (database, Redis) are available',
        responses: {
          200: { description: 'System is ready' },
          503: { description: 'System is not ready' },
        },
      },
    },
    '/health/status': {
      get: {
        tags: ['Health'],
        summary: 'Detailed system status',
        responses: {
          200: {
            description: 'System status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    version: { type: 'string' },
                    uptime: { type: 'number' },
                    database: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Prometheus metrics',
        responses: {
          200: {
            description: 'Prometheus-compatible metrics',
            content: { 'text/plain': {} },
          },
        },
      },
    },

    // CRM Contacts
    '/crm/contacts': {
      get: {
        tags: ['CRM - Contacts'],
        summary: 'List contacts',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'stage', in: 'query', schema: { type: 'string' } },
          { name: 'pipeline_id', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'tags', in: 'query', schema: { type: 'array', items: { type: 'string' } } },
        ],
        responses: {
          200: {
            description: 'List of contacts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/crm/contacts/{id}': {
      get: {
        tags: ['CRM - Contacts'],
        summary: 'Get contact by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Contact details' },
          404: { description: 'Contact not found' },
        },
      },
      put: {
        tags: ['CRM - Contacts'],
        summary: 'Update contact',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContactUpdate' },
            },
          },
        },
        responses: {
          200: { description: 'Contact updated' },
          404: { description: 'Contact not found' },
        },
      },
    },
    '/crm/contacts/{id}/move-stage': {
      post: {
        tags: ['CRM - Contacts'],
        summary: 'Move contact to stage',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { stage: { type: 'string' } },
                required: ['stage'],
              },
            },
          },
        },
        responses: { 200: { description: 'Contact moved' } },
      },
    },
    '/crm/contacts/{id}/activities': {
      get: {
        tags: ['CRM - Contacts'],
        summary: 'Get contact activities',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'List of activities' } },
      },
      post: {
        tags: ['CRM - Contacts'],
        summary: 'Log activity for contact',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ActivityCreate' },
            },
          },
        },
        responses: { 201: { description: 'Activity logged' } },
      },
    },

    // CRM Opportunities
    '/crm/opportunities': {
      get: {
        tags: ['CRM - Opportunities'],
        summary: 'List opportunities',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'pipeline_id', in: 'query', schema: { type: 'integer' } },
          { name: 'stage_id', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['Open', 'Won', 'Lost'] } },
        ],
        responses: { 200: { description: 'List of opportunities' } },
      },
      post: {
        tags: ['CRM - Opportunities'],
        summary: 'Create opportunity',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OpportunityCreate' },
            },
          },
        },
        responses: { 201: { description: 'Opportunity created' } },
      },
    },
    '/crm/opportunities/{id}': {
      put: {
        tags: ['CRM - Opportunities'],
        summary: 'Update opportunity',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OpportunityUpdate' },
            },
          },
        },
        responses: { 200: { description: 'Opportunity updated' } },
      },
    },
    '/crm/opportunities/{id}/move-stage': {
      post: {
        tags: ['CRM - Opportunities'],
        summary: 'Move opportunity to stage',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { stage_id: { type: 'integer' } },
                required: ['stage_id'],
              },
            },
          },
        },
        responses: { 200: { description: 'Opportunity moved' } },
      },
    },

    // Pipelines
    '/crm/pipelines': {
      get: {
        tags: ['CRM - Pipelines'],
        summary: 'List pipelines with stages',
        responses: { 200: { description: 'List of pipelines' } },
      },
    },
    '/crm/pipelines/{id}/stats': {
      get: {
        tags: ['CRM - Pipelines'],
        summary: 'Get pipeline statistics',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Pipeline statistics by stage' } },
      },
    },

    // Tasks
    '/crm/tasks': {
      post: {
        tags: ['CRM - Tasks'],
        summary: 'Create task',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskCreate' },
            },
          },
        },
        responses: { 201: { description: 'Task created' } },
      },
    },
    '/crm/tasks/{id}/complete': {
      post: {
        tags: ['CRM - Tasks'],
        summary: 'Complete task',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Task completed' } },
      },
    },
    '/crm/tasks/upcoming': {
      get: {
        tags: ['CRM - Tasks'],
        summary: 'Get upcoming tasks',
        parameters: [
          { name: 'user_id', in: 'query', schema: { type: 'integer' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 7 } },
        ],
        responses: { 200: { description: 'List of upcoming tasks' } },
      },
    },

    // Dashboard
    '/crm/dashboard': {
      get: {
        tags: ['CRM - Contacts'],
        summary: 'Get CRM dashboard stats',
        responses: { 200: { description: 'Dashboard statistics' } },
      },
    },

    // Audit
    '/audit/changes': {
      get: {
        tags: ['Audit'],
        summary: 'Query audit log',
        parameters: [
          { name: 'table_name', in: 'query', schema: { type: 'string' } },
          { name: 'record_id', in: 'query', schema: { type: 'string' } },
          { name: 'operation', in: 'query', schema: { type: 'string', enum: ['INSERT', 'UPDATE', 'DELETE'] } },
          { name: 'from_date', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to_date', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { 200: { description: 'Audit log entries' } },
      },
    },
    '/audit/history/{entityType}/{entityId}': {
      get: {
        tags: ['Audit'],
        summary: 'Get entity version history',
        parameters: [
          { name: 'entityType', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Entity version history' } },
      },
    },
    '/audit/history/{entityType}/{entityId}/compare': {
      get: {
        tags: ['Audit'],
        summary: 'Compare entity versions',
        parameters: [
          { name: 'entityType', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'v1', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'v2', in: 'query', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Version comparison' } },
      },
    },

    // Workflows
    '/workflows': {
      get: {
        tags: ['Workflows'],
        summary: 'List workflow definitions',
        responses: { 200: { description: 'List of workflows' } },
      },
      post: {
        tags: ['Workflows'],
        summary: 'Create workflow',
        responses: { 201: { description: 'Workflow created' } },
      },
    },
    '/workflows/{id}/trigger': {
      post: {
        tags: ['Workflows'],
        summary: 'Trigger workflow',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkflowTrigger' },
            },
          },
        },
        responses: { 200: { description: 'Workflow triggered' } },
      },
    },
  },
  components: {
    schemas: {
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          st_customer_id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          stage: { type: 'string' },
          pipeline_id: { type: 'integer' },
          tags: { type: 'array', items: { type: 'string' } },
          lead_score: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ContactUpdate: {
        type: 'object',
        properties: {
          stage: { type: 'string' },
          pipeline_id: { type: 'integer' },
          owner_id: { type: 'integer' },
          notes: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          custom_fields: { type: 'object' },
          lead_source: { type: 'string' },
          lead_score: { type: 'integer' },
          next_followup_at: { type: 'string', format: 'date-time' },
          do_not_contact: { type: 'boolean' },
        },
      },
      OpportunityCreate: {
        type: 'object',
        required: ['name'],
        properties: {
          contact_id: { type: 'integer' },
          st_estimate_id: { type: 'integer' },
          pipeline_id: { type: 'integer' },
          stage_id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          value: { type: 'number' },
          expected_close_date: { type: 'string', format: 'date-time' },
          owner_id: { type: 'integer' },
        },
      },
      OpportunityUpdate: {
        type: 'object',
        properties: {
          stage_id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          value: { type: 'number' },
          probability: { type: 'integer' },
          expected_close_date: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['Open', 'Won', 'Lost'] },
          lost_reason: { type: 'string' },
          owner_id: { type: 'integer' },
        },
      },
      ActivityCreate: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['note', 'call', 'email', 'meeting', 'task'] },
          subject: { type: 'string' },
          body: { type: 'string' },
          call_duration: { type: 'integer' },
          call_outcome: { type: 'string', enum: ['connected', 'voicemail', 'no-answer'] },
        },
      },
      TaskCreate: {
        type: 'object',
        required: ['title'],
        properties: {
          contact_id: { type: 'integer' },
          opportunity_id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          due_date: { type: 'string', format: 'date-time' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          assigned_to: { type: 'integer' },
        },
      },
      WorkflowTrigger: {
        type: 'object',
        required: ['entity_type', 'entity_id'],
        properties: {
          entity_type: { type: 'string' },
          entity_id: { type: 'string' },
          context: { type: 'object' },
        },
      },
    },
  },
};

export default openApiSpec;
