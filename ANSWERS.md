# Answers

Quick summary of both answers. Details and runnable artifacts live in each folder.

## Question 1 — single SQL statement

```sql
UPDATE user_role_rela
SET    role_id = 4            -- 'manage' grants 'modify products'
WHERE  user_id = 2           -- Taylor
  AND  role_id = 3;          -- replaces 'produce_consume' (create + delete products)
```

**Reasoning.** Taylor (user 2) holds `analyze` (→ *view products*) and `produce_consume`
(→ *create products* + *delete products*). The customer wants Taylor to **see and modify**
products but **not change inventory**. *Modify products* lives only in the `manage` role,
and creating/deleting products *is* the inventory change to remove — both map to the same
`user_role_rela` row, so a single `UPDATE` swapping `produce_consume` (3) → `manage` (4)
does it. `analyze` (view) stays; Ariel and Luka are untouched.

| Taylor      | view | modify | create | delete |
|-------------|------|--------|--------|--------|
| before fix  | ✅   | ❌     | ✅     | ✅     |
| after fix   | ✅   | ✅     | ❌     | ❌     |

Verified — see [`question-1-sql/`](question-1-sql/) (`node validate.js`, or the MySQL 8
`docker-compose` path).

## Question 2 — Resources API test plan

Aligned to the official **Open Finance Brasil — API Recursos (Resources) v3.0.0** OpenAPI
contract (single list endpoint `GET /open-banking/resources/v3/resources`; type/status
enums and response codes per spec). Full plan in
[`question-2-api-test-plan/test-plan.md`](question-2-api-test-plan/test-plan.md): scope,
test levels (contract / functional / security / performance / resilience / regression),
detailed functional + negative cases, a security section centered on **consent/scope
isolation** (the core risk in sharing client data between institutions), non-functional
targets, entry/exit criteria, risk-based prioritization, and reporting.

A runnable subset is automated as a Postman collection executed with Newman. It passes
green against the included mock (`npm run test:mock` → 16/16 assertions). See
[`RESULTS.md`](RESULTS.md) for captured output.
