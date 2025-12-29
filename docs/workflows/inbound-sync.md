# Inbound Sync Workflow

## Overview

This document describes the inbound synchronization workflow for receiving data from ServiceTitan into the Lazi system.

## Data Flow

1. **Webhook Reception** - ServiceTitan sends webhook events for entity changes
2. **Queue Processing** - Events are queued for processing
3. **Data Transformation** - Raw ST data is transformed to Lazi schema
4. **Database Update** - Transformed data is upserted to appropriate tables

## Supported Entity Types

- Customers
- Locations
- Jobs
- Invoices
- Pricebook Items
- Categories
- Equipment

## Implementation

See `services/api/src/sync/` for implementation details.
