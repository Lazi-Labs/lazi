---
description: Prime agent with LAZI AI codebase understanding
---

# Prime: Load LAZI AI Context

## Objective

Build comprehensive understanding of the LAZI AI codebase.

## Process

### 1. Analyze Project Structure

!`ls -la packages 2>/dev/null || echo "No packages dir"`
!`find apps/web/src -maxdepth 2 -type d 2>/dev/null | head -20`

### 2. Read Core Documentation

!`cat .agents/AGENTS.md 2>/dev/null || echo "No AGENTS.md"`

### 3. Check Current State

!`git log -10 --oneline`
!`git branch --show-current`
!`git status --short`

## Output Report

### Project Overview
- LAZI AI: ServiceTitan enhancement for outdoor living contractors
- Monorepo: apps/web (Next.js 14), packages/*, Docker
- Three-schema PostgreSQL (raw → master → crm)

### Tech Stack
- Next.js 14, TypeScript, PostgreSQL/Supabase
- Docker/Traefik, ServiceTitan API, BullMQ/Redis

### Current State
- Branch, recent commits, uncommitted work
