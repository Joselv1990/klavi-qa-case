# Question 2 — Resources API test plan & suite

- **[`test-plan.md`](test-plan.md)** — the deliverable: scope, approach, scenarios,
  security, non-functional, criteria, and risk-based prioritization.
- **`postman/`** — an executable subset (functional, contract, negative, and the
  deterministic security checks) as a Postman collection + environment.

## Running the suite

```bash
npm install
```

Set the target in `postman/resources-api.postman_environment.json` (or pass overrides on
the CLI):

| Variable                 | Meaning                                                     |
|--------------------------|-------------------------------------------------------------|
| `baseUrl`                | Sandbox base URL of the Resources API                       |
| `accessToken`            | Valid bearer token with the `resources` scope               |
| `otherConsentResourceId` | A resourceId from a **different** consent (isolation test)  |

```bash
npm test                 # CLI reporter
npm run test:report      # also writes newman/report.html
```

Override a value without editing the file:

```bash
newman run postman/resources-api.postman_collection.json \
  -e postman/resources-api.postman_environment.json \
  --env-var "baseUrl=https://api-sandbox.my-institution.com" \
  --env-var "accessToken=$TOKEN"
```

## What the collection covers

| Request | Maps to plan case |
|---------|-------------------|
| F-01 List resources – happy path | F-01, F-03, F-09, F-10 (status, schema, header echo, meta) |
| F-04 List resources – pagination links | F-04, F-05 |
| F-11 Resource detail – existing id | F-11 |
| F-12 Resource detail – not found | F-12 |
| S-01 Consent isolation | S-01, F-13, E-03 (no cross-consent leakage) |
| E-01 Missing Authorization | E-01 |
| E-07 Unsupported Accept | E-07 |

A collection-level pre-request script injects a fresh `x-fapi-interaction-id` (UUID) plus
the other required FAPI headers on every call, and the happy-path test asserts the id is
echoed back. Performance (k6/JMeter), DAST (ZAP/Burp), and mTLS validation are run with the
dedicated tools described in the plan.
