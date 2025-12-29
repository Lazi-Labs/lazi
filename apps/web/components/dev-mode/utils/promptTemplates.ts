// =============================================================================
// LAZI AI - DevMode 2.0 Prompt Templates
// =============================================================================
// Pre-built prompt templates for quick AI-ready implementation prompts
// =============================================================================

import { PromptTemplate } from '../types/devmode.types';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Element Templates
  {
    id: 'element-button-action',
    name: 'Button Click Action',
    category: 'element',
    template: `## Implement Button Action: {{elementText}}

**Location:** {{page}}
**Selector:** \`{{selector}}\`

### Required Behavior
When the "{{elementText}}" button is clicked:
1. {{action}}
2. Show loading state during operation
3. Display success/error toast on completion
4. {{postAction}}

### Implementation Notes
- Follow existing button patterns in the codebase
- Use the existing API client for requests
- Handle errors gracefully with user feedback`,
    variables: ['elementText', 'page', 'selector', 'action', 'postAction'],
  },
  {
    id: 'element-form-submit',
    name: 'Form Submission',
    category: 'element',
    template: `## Implement Form Submission

**Page:** {{page}}
**Form Selector:** \`{{selector}}\`

### Form Fields
{{fields}}

### Submission Behavior
1. Validate all required fields
2. Show field-level validation errors
3. Submit to \`{{endpoint}}\`
4. Handle success: {{successAction}}
5. Handle error: Display error message

### Validation Rules
- Required fields must be filled
- Email fields must be valid format
- {{customValidation}}`,
    variables: ['page', 'selector', 'fields', 'endpoint', 'successAction', 'customValidation'],
  },
  {
    id: 'element-modal-trigger',
    name: 'Modal Dialog',
    category: 'element',
    template: `## Implement Modal Dialog

**Trigger Element:** {{elementText}}
**Page:** {{page}}

### Modal Requirements
- **Title:** {{modalTitle}}
- **Content:** {{modalContent}}
- **Actions:** {{modalActions}}

### Behavior
1. Open modal when trigger element is clicked
2. Close on backdrop click or X button
3. Handle form submission if applicable
4. Return focus to trigger on close`,
    variables: ['elementText', 'page', 'modalTitle', 'modalContent', 'modalActions'],
  },

  // Data Templates
  {
    id: 'data-table-display',
    name: 'Data Table',
    category: 'data',
    template: `## Implement Data Table

**Page:** {{page}}
**Data Source:** {{schema}}.{{table}}

### Columns
{{columns}}

### Features Required
- Sortable columns: {{sortableColumns}}
- Filterable: {{filterable}}
- Pagination: {{pagination}} items per page
- Search: {{searchable}}

### API Endpoint
\`GET /api/{{endpoint}}\`

### Implementation Notes
- Use existing DataTable component pattern
- Implement server-side pagination
- Add loading states`,
    variables: ['page', 'schema', 'table', 'columns', 'sortableColumns', 'filterable', 'pagination', 'searchable', 'endpoint'],
  },
  {
    id: 'data-fetch-display',
    name: 'Fetch and Display Data',
    category: 'data',
    template: `## Fetch and Display Data

**Component:** {{componentName}}
**Page:** {{page}}

### Data Requirements
- **Source:** \`{{endpoint}}\`
- **Method:** {{method}}
- **Refresh:** {{refreshStrategy}}

### Display Format
{{displayFormat}}

### States to Handle
1. Loading: Show skeleton/spinner
2. Error: Display error message with retry
3. Empty: Show empty state message
4. Success: Render data as specified`,
    variables: ['componentName', 'page', 'endpoint', 'method', 'refreshStrategy', 'displayFormat'],
  },

  // Page Templates
  {
    id: 'page-crud-list',
    name: 'CRUD List Page',
    category: 'page',
    template: `## Implement CRUD List Page

**Page Route:** {{route}}
**Entity:** {{entity}}

### Features
- **List View:** Display all {{entity}} items
- **Create:** Add new {{entity}} via modal/page
- **Read:** View {{entity}} details
- **Update:** Edit {{entity}} inline or via modal
- **Delete:** Remove {{entity}} with confirmation

### API Endpoints
- \`GET /api/{{endpoint}}\` - List all
- \`GET /api/{{endpoint}}/:id\` - Get one
- \`POST /api/{{endpoint}}\` - Create
- \`PUT /api/{{endpoint}}/:id\` - Update
- \`DELETE /api/{{endpoint}}/:id\` - Delete

### UI Requirements
- Search/filter bar
- Sortable table columns
- Bulk actions (if applicable)
- Pagination`,
    variables: ['route', 'entity', 'endpoint'],
  },
  {
    id: 'page-dashboard',
    name: 'Dashboard Page',
    category: 'page',
    template: `## Implement Dashboard Page

**Page Route:** {{route}}
**Purpose:** {{purpose}}

### Widgets/Cards
{{widgets}}

### Data Sources
{{dataSources}}

### Features
- Auto-refresh every {{refreshInterval}}
- Date range filter: {{dateRange}}
- Export capability: {{exportFormat}}

### Layout
{{layout}}`,
    variables: ['route', 'purpose', 'widgets', 'dataSources', 'refreshInterval', 'dateRange', 'exportFormat', 'layout'],
  },

  // Error Templates
  {
    id: 'error-fix-bug',
    name: 'Bug Fix',
    category: 'error',
    template: `## Bug Fix Required

**Page:** {{page}}
**Component:** {{component}}

### Problem Description
{{problemDescription}}

### Steps to Reproduce
{{reproductionSteps}}

### Expected Behavior
{{expectedBehavior}}

### Actual Behavior
{{actualBehavior}}

### Console Errors
\`\`\`
{{consoleErrors}}
\`\`\`

### Environment
- Browser: {{browser}}
- URL: {{url}}
- User Action: {{userAction}}`,
    variables: ['page', 'component', 'problemDescription', 'reproductionSteps', 'expectedBehavior', 'actualBehavior', 'consoleErrors', 'browser', 'url', 'userAction'],
  },
  {
    id: 'error-api-failure',
    name: 'API Error Handling',
    category: 'error',
    template: `## Fix API Error

**Endpoint:** \`{{endpoint}}\`
**Method:** {{method}}
**Status:** {{status}}

### Error Details
\`\`\`json
{{errorResponse}}
\`\`\`

### Request Details
\`\`\`json
{{requestPayload}}
\`\`\`

### Required Fix
{{fixDescription}}

### Acceptance Criteria
- API returns success response
- UI updates correctly
- Error handling is in place`,
    variables: ['endpoint', 'method', 'status', 'errorResponse', 'requestPayload', 'fixDescription'],
  },
];

/**
 * Fill template with provided values
 */
export function fillTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || `[${key}]`);
  }
  return result;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: PromptTemplate['category']
): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Extract missing variables from template
 */
export function getMissingVariables(
  template: PromptTemplate,
  values: Record<string, string>
): string[] {
  return template.variables.filter((v) => !values[v] || values[v].trim() === '');
}

/**
 * Generate prompt from current context
 */
export function generateContextualPrompt(
  templateId: string,
  context: {
    page?: string;
    selector?: string;
    elementText?: string;
    description?: string;
    schema?: string;
    table?: string;
    columns?: string[];
  }
): { prompt: string; missingVariables: string[] } {
  const template = getTemplateById(templateId);
  if (!template) {
    return { prompt: '', missingVariables: [] };
  }

  const values: Record<string, string> = {
    page: context.page || window.location.pathname,
    selector: context.selector || '',
    elementText: context.elementText || '',
    schema: context.schema || '',
    table: context.table || '',
    columns: context.columns?.join(', ') || '',
  };

  const prompt = fillTemplate(template.template, values);
  const missingVariables = getMissingVariables(template, values);

  return { prompt, missingVariables };
}
