-- Question 1 — the single statement that produces the expected behavior.
--
-- Taylor (user_id = 2) currently holds:
--   role 2 'analyze'         -> action 4 'view products'
--   role 3 'produce_consume' -> action 2 'create products', action 6 'delete products'
--
-- Required: Taylor must SEE and MODIFY products, but must NOT change inventory.
--   - "view products"   (action 4) -> already granted via role 2 'analyze'  -> keep
--   - "modify products" (action 5) -> only in role 4 'manage'               -> must gain
--   - "create/delete products" (actions 2 & 6 = changing inventory)         -> must lose
--
-- Both required removals (create + delete) and the missing grant align perfectly
-- with swapping the 'produce_consume' role (3) for the 'manage' role (4).
-- That makes it a single, surgical UPDATE.

USE qa_case;

UPDATE user_role_rela
SET    role_id = 4            -- 'manage' -> grants 'modify products'
WHERE  user_id = 2           -- Taylor
  AND  role_id = 3;          -- replaces 'produce_consume' (create + delete products)
