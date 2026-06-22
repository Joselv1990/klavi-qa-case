# Verification results

Both parts verified locally without Docker (no virtualization available on the dev
machine). The MySQL 8 `docker-compose` path in `question-1-sql/` is still provided for
environments where virtualization is enabled.

## Question 1 — `node question-1-sql/validate.js`

The validator models the seeded tables and resolves `user → role → action` before and
after applying `solution.sql`.

```
=== BEFORE FIX ===
Ariel   -> create bills, view bills
Taylor  -> create products, delete products, view products
Luka    -> create products, delete products, modify products, view products

=== AFTER FIX ===
Ariel   -> create bills, view bills
Taylor  -> modify products, view products
Luka    -> create products, delete products, modify products, view products

Taylor can see + modify products, no inventory change: true
PASS
```

## Question 2 — `npm run test:mock` (Newman against the bundled mock)

```
→ F-01 List resources - happy path        [200] √ 7 assertions
→ F-04 List resources - pagination links   [200] √ 4 assertions
→ F-11 Resource detail - existing id       [200] √ 2 assertions
→ F-12 Resource detail - not found         [404] √ 2 assertions
→ S-01 Consent isolation                   [403] √ 2 assertions
→ E-01 Missing Authorization header        [401] √ 1 assertion
→ E-07 Unsupported Accept                  [406] √ 1 assertion

assertions: 19 executed, 0 failed
```

The mock is a stand-in only; real runs target the sandbox via `npm test` with the
environment pointed at the live Resources API.
