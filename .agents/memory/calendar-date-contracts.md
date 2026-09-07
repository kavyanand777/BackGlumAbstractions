---
name: Calendar date contracts
description: How expense-like calendar dates should be represented across OpenAPI, generated clients, and Drizzle.
---

Calendar-only values should stay as validated `YYYY-MM-DD` strings in OpenAPI contracts instead of using OpenAPI `format: date` when the database uses Drizzle `date(..., { mode: "string" })`.

**Why:** The generator maps `format: date` to JavaScript `Date`, which conflicts with Drizzle's string-backed calendar date type and can introduce timezone shifts in user-entered dates.

**How to apply:** Use a strict `YYYY-MM-DD` pattern for request, query, and response calendar dates; reserve `format: date-time` for real instants such as `createdAt`.