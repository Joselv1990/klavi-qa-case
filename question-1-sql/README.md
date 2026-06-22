# Question 1 — RBAC permission fix

## Problem

> Taylor can create products but cannot modify them. Taylor **should be able to see and
> modify** products, but **not change the company's inventory**.

## How the model maps out

Resolving each user's effective permissions (`user → role → action`):

| User   | Roles                       | Effective product actions                       |
|--------|-----------------------------|-------------------------------------------------|
| Ariel  | charge                      | (bills only)                                     |
| Taylor | analyze, produce_consume    | view, **create**, **delete**                     |
| Luka   | analyze, produce_consume, manage | view, create, delete, modify                |

Action-to-role breakdown:

| action_id | description      | granted by role |
|-----------|------------------|-----------------|
| 2         | create products  | produce_consume |
| 4         | view products    | analyze         |
| 5         | modify products  | manage          |
| 6         | delete products  | produce_consume |

## Analysis

Taylor's current product powers come from two roles:

- `analyze` (role 2) → **view products** — this is the "see" the customer wants. **Keep.**
- `produce_consume` (role 3) → **create products** + **delete products** — creating and
  deleting products *is* changing inventory. This is exactly what the customer wants to
  **revoke.**

What's missing is **modify products** (action 5), which lives only in the `manage`
role (role 4).

So the requirement decomposes cleanly:

- **Gain:** `modify products` → add role `manage`.
- **Lose:** `create products` + `delete products` → remove role `produce_consume`.
- **Keep:** `view products` (from `analyze`, untouched).

The role to *remove* (`produce_consume`) and the role to *add* (`manage`) cover Taylor in
the same `user_role_rela` row, so the entire change is a single, surgical `UPDATE` that
swaps one role id for the other — no `INSERT` + `DELETE` pair needed.

## The statement

```sql
UPDATE user_role_rela
SET    role_id = 4            -- 'manage' -> grants 'modify products'
WHERE  user_id = 2           -- Taylor
  AND  role_id = 3;          -- replaces 'produce_consume' (create + delete products)
```

## Result

| User   | Roles after fix   | Effective product actions |
|--------|-------------------|---------------------------|
| Taylor | analyze, manage   | **view**, **modify**      |

Taylor can now see and modify products and can no longer create or delete them
(no inventory changes). Ariel and Luka are unaffected.

## Run it end-to-end

```bash
docker compose up -d
docker compose exec -T mysql mysql -uroot -proot < schema.sql
docker compose exec -T mysql mysql -uroot -proot qa_case < seed.sql
docker compose exec -T mysql mysql -uroot -proot qa_case < verify.sql    # BEFORE
docker compose exec -T mysql mysql -uroot -proot qa_case < solution.sql
docker compose exec -T mysql mysql -uroot -proot qa_case < verify.sql    # AFTER
docker compose down -v
```
