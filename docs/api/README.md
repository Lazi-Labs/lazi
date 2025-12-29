# API Documentation

Complete API endpoint registries for all ServiceTitan API domains.

## Overview

This directory contains lightweight endpoint registry files extracted from OpenAPI specifications. Each registry provides a structured view of all endpoints for a specific API domain.

## Files

### Summary
- **[ENDPOINT_REGISTRY_SUMMARY.md](ENDPOINT_REGISTRY_SUMMARY.md)** - Complete overview of all registries

### Endpoint Registries (18 files)

| Registry File | Endpoints | Domain |
|--------------|-----------|--------|
| [openapi.endpoint-registry.json](openapi.endpoint-registry.json) | 20 | Main API |
| [tenant-crm-v2.endpoint-registry.json](tenant-crm-v2.endpoint-registry.json) | 86 | CRM Operations |
| [tenant-jpm-v2.endpoint-registry.json](tenant-jpm-v2.endpoint-registry.json) | 69 | Job/Project Management |
| [tenant-accounting-v2.endpoint-registry.json](tenant-accounting-v2.endpoint-registry.json) | 54 | Accounting |
| [tenant-inventory-v2.endpoint-registry.json](tenant-inventory-v2.endpoint-registry.json) | 47 | Inventory |
| [tenant-pricebook-v2.endpoint-registry.json](tenant-pricebook-v2.endpoint-registry.json) | 40 | Pricebook |
| [tenant-dispatch-v2.endpoint-registry.json](tenant-dispatch-v2.endpoint-registry.json) | 36 | Dispatch |
| [tenant-payroll-v2.endpoint-registry.json](tenant-payroll-v2.endpoint-registry.json) | 34 | Payroll |
| [tenant-settings-v2.endpoint-registry.json](tenant-settings-v2.endpoint-registry.json) | 20 | Settings |
| [tenant-marketing-v2.endpoint-registry.json](tenant-marketing-v2.endpoint-registry.json) | 19 | Marketing |
| [tenant-timesheets-v2.endpoint-registry.json](tenant-timesheets-v2.endpoint-registry.json) | 12 | Timesheets |
| [tenant-telecom.endpoint-registry.json](tenant-telecom.endpoint-registry.json) | 10 | Telecom |
| [tenant-equipment-systems-v2.endpoint-registry.json](tenant-equipment-systems-v2.endpoint-registry.json) | 8 | Equipment Systems |
| [tenant-marketing-ads-v2.endpoint-registry.json](tenant-marketing-ads-v2.endpoint-registry.json) | 7 | Marketing Ads |
| [tenant-forms-v2.endpoint-registry.json](tenant-forms-v2.endpoint-registry.json) | 5 | Forms |
| [tenant-reporting-v2.endpoint-registry.json](tenant-reporting-v2.endpoint-registry.json) | 5 | Reporting |
| [tenant-task-management-v2.endpoint-registry.json](tenant-task-management-v2.endpoint-registry.json) | 5 | Task Management |
| [tenant-jbce-v2.endpoint-registry.json](tenant-jbce-v2.endpoint-registry.json) | 1 | JBCE |

**Total**: 478 endpoints across 18 API domains

## Registry Format

Each registry file contains:
- Source file reference
- Base URL
- OpenAPI version
- API title and version
- Sections (grouped by tags)
- Endpoints with full details
- Statistics by HTTP method

## Usage Examples

### View endpoint count
```bash
jq '.stats.totalEndpoints' tenant-crm-v2.endpoint-registry.json
```

### List all sections
```bash
jq '.sections[].name' tenant-crm-v2.endpoint-registry.json
```

### Find all GET endpoints
```bash
jq '.sections[].endpoints[] | select(.method == "GET")' tenant-crm-v2.endpoint-registry.json
```

### Find destructive operations
```bash
jq '.sections[].endpoints[] | select(.classification.destructive == true)' tenant-crm-v2.endpoint-registry.json
```

## Classification

All endpoints are automatically classified:
- **GET** → `readOnly: true`
- **POST** → `writesData: true`
- **PATCH/PUT** → `writesData: true`
- **DELETE** → `destructive: true`

## Benefits

- **Lightweight**: 80% smaller than original OpenAPI specs
- **Structured**: Organized by tags/sections
- **Searchable**: Easy to query with jq
- **Complete**: All endpoint details preserved
- **Validated**: All files are valid JSON

## Related Documentation

- [Integration Guide](../architecture/integration/INTEGRATION_GUIDE.md)
- [Testing Results](../architecture/testing/PHASE_2_TESTING_RESULTS.md)
- [Deployment Status](../architecture/deployment/FINAL_OPERATIONAL_STATUS.md)
