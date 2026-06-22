# Running CI locally

The GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs
two jobs on every push/PR to `main`. Both are plain Node steps, so you can reproduce them
locally with the exact same commands — no Docker or virtualization required.

## Prerequisites

- Node.js 20 (the version pinned in the workflow). Check with `node --version`.

## Reproduce each job

### Job `question-1-sql` — RBAC fix validation

```bash
cd question-1-sql
node validate.js
```

Expected: prints the before/after permission tables and ends with `PASS` (exit code 0).

### Job `question-2-api` — Resources API suite (Newman vs mock)

```bash
cd question-2-api-test-plan
npm ci                 # same as CI; uses package-lock.json
npm run test:mock      # boots the mock and runs the Postman collection with Newman
```

Expected: `16 assertions, 0 failed` (exit code 0).

> `npm ci` requires the committed `package-lock.json`. For day-to-day work `npm install`
> also works; CI uses `npm ci` for reproducible installs.

## Run both, exactly like CI, in one go

```bash
( cd question-1-sql && node validate.js ) \
  && ( cd question-2-api-test-plan && npm ci && npm run test:mock )
```

If that command exits 0, the CI pipeline will pass.

## Optional — run the actual workflow with `act`

[`act`](https://github.com/nektos/act) executes GitHub Actions workflows locally inside
containers:

```bash
act push
```

Note: `act` needs Docker (and therefore hardware virtualization). On machines where
virtualization is disabled, use the plain Node commands above — they run the same steps
without containers.
