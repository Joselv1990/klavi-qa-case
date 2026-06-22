# Test Plan — Resources API

## 1. Context

A financial institution is building an API to share information about its clients with
other institutions. This document is the test plan for the **Resources API** — the
endpoint family that lists the financial resources (accounts, cards, loans, financings,
investments, etc.) a customer has consented to share, and that other resource-specific
APIs (Accounts, Credit Cards, Loans…) depend on.

Because the data is regulated, customer-permissioned, and shared across institutions, the
API is expected to follow the security profile common to open-finance ecosystems
(OAuth 2.0 + FAPI, consent-scoped access, mTLS, FAPI interaction headers). The plan treats
those as first-class requirements, not afterthoughts.

### 1.1 API under test (assumed contract)

| Method | Path                                  | Purpose                                   |
|--------|---------------------------------------|-------------------------------------------|
| GET    | `/resources/v3/resources`             | List the consented resources (paginated)  |
| GET    | `/resources/v3/resources/{resourceId}`| Detail / status of a single resource      |

Resource object (key fields):

| Field        | Notes                                                                 |
|--------------|-----------------------------------------------------------------------|
| `resourceId` | Opaque id, max 100 chars                                              |
| `type`       | Enum: `ACCOUNT`, `CREDIT_CARD_ACCOUNT`, `LOAN`, `FINANCING`, `INVOICE_FINANCING`, `UNARRANGED_ACCOUNT_OVERDRAFT`, … |
| `status`     | Enum: `AVAILABLE`, `UNAVAILABLE`, `TEMPORARILY_UNAVAILABLE`, `PENDING_AUTHORISATION` |

Envelope: `data[]`, `links` (`self`, `first`, `prev`, `next`, `last`), `meta`
(`totalRecords`, `totalPages`, `requestDateTime`).

Required request headers: `Authorization: Bearer <token>`, `x-fapi-interaction-id`
(UUID, echoed back), `x-fapi-auth-date`, `x-fapi-customer-ip-address`, `Accept:
application/json`.

## 2. Objectives

- Verify the API returns the **correct resources** for a given consent, with the **correct
  status**, in the **contract-defined schema**.
- Confirm it **never exposes data outside the granted consent / scope** (the core privacy
  risk when sharing client data between institutions).
- Validate security, error handling, pagination, performance, and resilience before it is
  exposed to external consumers.

## 3. Scope

**In scope**

- Functional behavior of both endpoints (list + detail).
- Contract / schema conformance (status codes, response shape, enums, headers).
- AuthN/AuthZ: token validity, scope, consent binding, expiry/revocation.
- Negative and boundary cases, error responses.
- Pagination and filtering.
- Non-functional: performance, rate limiting, availability, idempotency of reads.

**Out of scope**

- The Authorization Server / consent-management UI itself (consumed as a dependency).
- Downstream resource APIs (Accounts, Cards…) beyond the link references they expose.
- Infrastructure provisioning and network setup.

## 4. Test approach & levels

| Level                 | Focus                                                              | Tooling                  |
|-----------------------|--------------------------------------------------------------------|--------------------------|
| Contract testing      | Schema, status codes, enums, headers match the OpenAPI spec        | Postman + JSON schema    |
| Functional / API      | End-to-end behavior of each endpoint and scenario                  | Postman + Newman         |
| Security testing      | OAuth2/FAPI, scope/consent enforcement, TLS, injection, leakage    | Postman, manual, ZAP     |
| Performance testing   | Latency, throughput, behavior under load and rate limits           | k6 / JMeter              |
| Resilience testing    | Dependency failure, timeouts, partial/`TEMPORARILY_UNAVAILABLE`    | Postman + fault injection|
| Regression            | Full suite re-run on every build in CI                             | Newman in CI             |

The executable Postman + Newman suite in this folder covers the contract, functional,
negative, and the deterministic security checks. Performance, deep security (DAST/pen),
and resilience are described here and run with the dedicated tools above.

## 5. Functional test scenarios

### 5.1 List resources — `GET /resources/v3/resources`

| # | Scenario | Expected |
|---|----------|----------|
| F-01 | Valid token + consent with resources | `200`; `data[]` non-empty; each item has `resourceId`, valid `type`, valid `status`; `links` + `meta` present |
| F-02 | Valid consent with **no** resources | `200`; `data` = `[]`; `meta.totalRecords` = 0 (empty list, not an error) |
| F-03 | Schema conformance | All fields match types/enums; no extra/undocumented fields; `resourceId` ≤ 100 chars |
| F-04 | Pagination — `page-size` honored | `200`; `data.length` ≤ `page-size`; `links.next` present when more pages exist |
| F-05 | Pagination — navigate `next`/`last` | Following `links.next` returns subsequent page; `last` page has no `next` |
| F-06 | Pagination — page beyond range | Graceful empty page or `422`/`400` per spec; never `500` |
| F-07 | All resource `type` values represent correctly | Each documented type seen in test data is returned with the right label |
| F-08 | `status` reflects real availability | A resource set to `TEMPORARILY_UNAVAILABLE` upstream is reported as such |
| F-09 | `x-fapi-interaction-id` echo | Response echoes the same id sent by the client |
| F-10 | `meta.totalRecords` / `totalPages` consistency | Counts match the actual number of returned/total records |

### 5.2 Resource detail — `GET /resources/v3/resources/{resourceId}`

| # | Scenario | Expected |
|---|----------|----------|
| F-11 | Existing resourceId within consent | `200`; single resource matching the id |
| F-12 | Well-formed id that does not exist | `404` with standard error body |
| F-13 | resourceId belonging to **another** consent/customer | `403`/`404` — **must not** leak that it exists or its data |
| F-14 | Malformed / oversized resourceId | `400`/`422`; no stack trace, no `500` |

## 6. Negative & error-handling tests

| # | Condition | Expected |
|---|-----------|----------|
| E-01 | Missing `Authorization` header | `401` |
| E-02 | Expired / invalid / tampered token | `401` |
| E-03 | Valid token, **wrong/insufficient scope** | `403` |
| E-04 | Valid token but consent **revoked / expired** | `401`/`403` per spec; no data returned |
| E-05 | Missing required FAPI headers (`x-fapi-interaction-id`, `x-fapi-auth-date`) | `400` |
| E-06 | Malformed `x-fapi-interaction-id` (not a UUID) | `400` |
| E-07 | Unsupported `Accept` (e.g. `text/xml`) | `406` |
| E-08 | Unsupported method (`POST`/`DELETE` on read endpoint) | `405` |
| E-09 | Error bodies follow the standard error schema | `code`, `title`, `detail`; no internal/PII leakage |

## 7. Security testing

The biggest risk is **a consumer institution seeing data it was never authorized to see.**

| # | Area | Check |
|---|------|-------|
| S-01 | Consent isolation (BOLA/IDOR) | Token for consent A can never read resources of consent B; iterate/guess `resourceId`s |
| S-02 | Scope enforcement | Token without `resources` scope is rejected (`403`) |
| S-03 | Token validation | Expired, `alg:none`, wrong audience/issuer, bad signature all rejected |
| S-04 | Transport security | TLS ≥ 1.2 enforced; mTLS client cert required and validated; plain HTTP refused |
| S-05 | Rate limiting / throttling | Excess requests return `429` with `Retry-After`; limits documented |
| S-06 | Injection | SQLi/NoSQLi/path-traversal payloads in `resourceId` and query params are rejected safely |
| S-07 | Data minimization & leakage | Responses contain only contract fields; error messages reveal no stack traces, SQL, internal hosts, or PII |
| S-08 | Security headers | `Cache-Control: no-store`, `Content-Type: application/json`; no sensitive data cached |
| S-09 | Logging | Tokens and PII are not written to logs |

Tools: Postman/Newman for the deterministic checks (S-01, S-02, S-05, S-07), OWASP ZAP /
Burp for DAST, manual review + targeted pen test for S-03/S-04.

## 8. Non-functional testing

| # | Type | Target / check |
|---|------|----------------|
| P-01 | Latency | p95 response time within agreed SLA under nominal load |
| P-02 | Throughput | Sustains target RPS without error-rate increase |
| P-03 | Load / stress | Degrades gracefully past capacity; recovers after spike |
| P-04 | Rate-limit behavior | Verified under load that `429`s are returned, not `500`s |
| R-01 | Dependency failure | Upstream/core-banking down → `503`/`TEMPORARILY_UNAVAILABLE`, not a crash |
| R-02 | Timeout handling | Slow dependency → bounded timeout + standard error, no hung connections |
| A-01 | Availability | Meets uptime SLA; health/monitoring endpoints behave |

## 9. Test data & environments

- **Environments:** dedicated **sandbox/homologation** with seeded consents and resources;
  no production data.
- **Test data:** consents covering — many resources, single resource, zero resources,
  mixed `status` values, every `type`, and a *second* customer/consent used exclusively for
  isolation tests (S-01). Tokens for: valid, expired, wrong-scope, revoked-consent.
- **Data management:** seed scripts create a known fixture state before runs; sensitive
  values come from environment variables / a secrets store, never committed.

## 10. Tooling

- **Postman + Newman** — functional, contract, negative, deterministic security; runs in CI.
- **k6 / JMeter** — performance and rate-limit load.
- **OWASP ZAP / Burp Suite** — DAST and security scanning.
- **CI (GitHub Actions / similar)** — Newman on every PR + nightly full + performance runs.

## 11. Entry & exit criteria

**Entry**

- API deployed to sandbox; OpenAPI/contract available.
- Test consents, tokens, and seed data provisioned.
- Auth server reachable.

**Exit**

- 100% of planned functional, contract, and negative cases executed.
- All Critical/High defects fixed and retested; no open Critical/High.
- Security checks S-01–S-04 pass (zero cross-consent leakage).
- Performance meets agreed SLA; rate limiting verified.
- Regression suite green in CI.

## 12. Risk-based prioritization

| Priority | Area | Why |
|----------|------|-----|
| P0 | Consent/scope isolation (S-01, S-02, E-03, F-13) | Cross-customer data exposure is the worst-case regulatory + trust failure |
| P0 | AuthN (E-01, E-02, S-03) | Gatekeeper for everything else |
| P1 | Contract & functional correctness (F-01…F-14) | Downstream institutions depend on this shape |
| P1 | Error handling (E-05…E-09) | Stability and no information leakage |
| P2 | Pagination, performance, resilience | Scale and UX once correctness/security hold |

## 13. Reporting

- Newman generates HTML/JSON reports per run, archived in CI artifacts.
- Defects logged with severity, steps, request/response (tokens redacted), expected vs.
  actual.
- Metrics tracked: pass rate, defect density by area, requirement coverage, p95 latency
  trend, count of open Critical/High.
