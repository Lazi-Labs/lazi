---
description: Prime agent with LAZI AI codebase understanding
---

# Prime: Load LAZI AI Context

## Objective

Build comprehensive understanding of the LAZI AI codebase.

## Process

### 1. Read Global Rules

!`cat CLAUDE.md`

### 2. Analyze Project Structure

!`ls -la apps/web/app 2>/dev/null | head -20`
!`ls -la packages 2>/dev/null`

### 3. Check Current State

!`git log -10 --oneline`
!`git branch --show-current`
!`git status --short`

### 4. Identify Key Patterns

Read recent files for patterns:
!`find apps/web/app/api -name "route.ts" | head -5 | xargs -I {} sh -c 'echo "=== {} ===" && head -50 {}'`

## Output Report

### Project Overview
- LAZI AI: ServiceTitan enhancement for outdoor living contractors
- Monorepo: apps/web (Next.js 14), packages/*, services/*
- Three-schema PostgreSQL (raw → master → crm)

### Tech Stack
- Next.js 14, TypeScript, Tailwind CSS
- PostgreSQL/Supabase, Docker/Traefik
- ServiceTitan API, BullMQ/Redis

### Architecture Patterns
- App Router with route handlers
- Three-schema database pattern
- Component-based UI

### Current State
- Branch, recent commits, uncommitted work
- Key observations

**Make this scannable - bullets and headers.**
