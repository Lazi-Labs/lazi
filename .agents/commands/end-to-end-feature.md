---
description: Autonomously develop complete feature from planning to commit
argument-hint: [feature-description]
---

# End-to-End Feature: $ARGUMENTS

Chains: prime → planning → execute → commit

---

## Step 1: Prime
@commands/prime.md

## Step 2: Planning (feature: $ARGUMENTS)
@commands/planning.md
Note the feature name for Step 3.

## Step 3: Execute (plan: plans/[feature-name].md)
@commands/execute.md

## Step 4: Commit
@commands/commit.md

---

## Summary

| Step | Status |
|------|--------|
| Prime | ✅ |
| Planning | ✅ plans/[name].md |
| Execute | ✅ |
| Commit | ✅ [hash] |

**Next**: `git push` or `mv plans/[name].md plans/completed/`
