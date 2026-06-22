# QA Case

[![CI](https://github.com/Joselv1990/klavi-qa-case/actions/workflows/ci.yml/badge.svg)](https://github.com/Joselv1990/klavi-qa-case/actions/workflows/ci.yml)

> **Start here:** [`ANSWERS.md`](ANSWERS.md) for both answers at a glance,
> [`RESULTS.md`](RESULTS.md) for the captured verification output, and
> [`CI.md`](CI.md) to run the CI checks locally.

Solution for a two-part QA case study:

- **Question 1** — Diagnose a broken role/permission setup and fix it with a single SQL statement (MySQL 8).
- **Question 2** — Test plan for the implementation of a financial-institution **Resources API** (Open Finance style), including an executable Postman + Newman suite.

## Repository layout

```
klavi-qa-case/
├── question-1-sql/                 # RBAC permission fix
│   ├── README.md                   # problem analysis + reasoning
│   ├── schema.sql                  # table definitions
│   ├── seed.sql                    # data exactly as given in the case
│   ├── solution.sql                # the single fix statement
│   ├── verify.sql                  # before/after permission audit queries
│   └── docker-compose.yml          # disposable MySQL 8 to run it end-to-end
│
└── question-2-api-test-plan/       # Resources API testing
    ├── README.md                   # how to run the suite
    ├── test-plan.md                # the full test plan (the deliverable)
    ├── package.json                # newman runner scripts
    └── postman/
        ├── resources-api.postman_collection.json
        └── resources-api.postman_environment.json
```

## Quick start

### Question 1

```bash
cd question-1-sql
docker compose up -d                              # start MySQL 8
docker compose exec -T mysql mysql -uroot -proot < schema.sql
docker compose exec -T mysql mysql -uroot -proot qa_case < seed.sql
docker compose exec -T mysql mysql -uroot -proot qa_case < verify.sql    # state BEFORE the fix
docker compose exec -T mysql mysql -uroot -proot qa_case < solution.sql  # apply the fix
docker compose exec -T mysql mysql -uroot -proot qa_case < verify.sql    # state AFTER the fix
docker compose down -v
```

### Question 2

```bash
cd question-2-api-test-plan
npm install
npm test            # runs the Postman collection with Newman against the configured environment
```

See [`question-2-api-test-plan/test-plan.md`](question-2-api-test-plan/test-plan.md) for the plan itself.
