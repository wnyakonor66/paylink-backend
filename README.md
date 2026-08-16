# PayLink API

Backend REST API for a mobile wallet app — authentication, wallet balances,
peer-to-peer transfers, transaction history, and QR payment payloads. Built to
demonstrate the backend skills behind mobile/fintech engineering roles: secure
API design, JWT authentication, relational data modeling with Prisma, and
automated testing.

## Why this project

Built as a self-contained demo of how a digital payments backend works —
covering secure auth, atomic money transfers, and a tested, documented REST
API, using the same patterns (JWT, hashed passwords, relational schema,
CI-ready test suite) found in real payment platforms.

## Tech stack

- **Runtime:** Node.js + Express
- **Database:** PostgreSQL (hosted on [Neon](https://neon.tech), serverless)
- **ORM:** Prisma
- **Auth:** JWT (short-lived access token + longer-lived refresh token), bcrypt password hashing
- **Validation:** Zod
- **Testing:** Jest + Supertest (23 passing tests across auth and wallet flows)
- **Rate limiting:** express-rate-limit

## Getting started

```bash
git clone <your-repo-url>
cd paylink-backend
npm install
```

Create a `.env` file in the project root:

PORT=3030
NODE_ENV=development
DATABASE_URL="your-neon-connection-string"
JWT_ACCESS_SECRET="a-long-random-string"
JWT_REFRESH_SECRET="a-different-long-random-string"

Run the database migrations against your Neon database:
```bash
npx prisma migrate dev
```

Start the server:
```bash
npm run dev
```
Server runs at `http://localhost:3030`. Check `http://localhost:3030/health` to confirm it's up.

## Running tests

```bash
npm test
```
Runs the full Jest/Supertest suite against a real Neon database connection
(no test-database isolation yet — see "Known limitations" below).

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/signup` | No | Create an account and a linked wallet. Returns access + refresh tokens. |
| POST | `/login` | No | Log in with email/password. Returns access + refresh tokens. |
| POST | `/refresh` | No | Exchange a valid refresh token for a new access token. |

### Wallet — `/api/wallet`
| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | `/` | Yes | Get the caller's wallet balance. |
| POST | `/topup` | Yes | Credit the caller's own wallet (simulated funding). |
| POST | `/send` | Yes | Transfer money to another user by email. Atomic — both wallet updates and both transaction records succeed or fail together. |

### Transactions — `/api/transaction`
| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | `/` | Yes | List all transactions tied to the caller's wallet, newest first. |

### QR — `/api`
| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | `/my-code` | Yes | Generate a JSON payload identifying the caller, for encoding into a QR code. |
| POST | `/decode` | Yes | Validate and decode a scanned QR payload before initiating a transfer. |

> Note: QR routes are currently mounted directly under `/api` rather than
> `/api/qr` — a deliberate simplification for the MVP, flagged here so it's
> not mistaken for an oversight.

## Data model

Four Prisma models: `User`, `Wallet` (one-to-one with User), `Transaction`
(belongs to a Wallet), `Notification` (belongs to a User). Money fields use
Prisma's `Decimal` type (not float) to avoid floating-point precision issues
with currency. See `prisma/schema.prisma` for the full schema.

## Design notes worth knowing

- **Atomic transfers:** `/wallet/send` wraps all four writes (debit sender,
  credit recipient, log both transaction records) in a single
  `prisma.$transaction([...])` call — either all four succeed, or none do.
  This prevents money from ever "disappearing" between two wallets if a
  write fails partway through.
- **Password security:** passwords are hashed with bcrypt before storage;
  plaintext passwords are never persisted or logged.
- **Token strategy:** short-lived access tokens (15 min) limit the exposure
  window if a token leaks; a longer-lived refresh token avoids forcing
  frequent re-logins.

## Known limitations / what I'd add next

- No isolated test database — tests currently run against the real Neon
  database, so repeated runs accumulate test user rows.
- No push notifications (in-app notification list only).
- No Sentry/crash reporting integration yet.
- QR routes could use route-level isolation under `/api/qr` for consistency
  with the rest of the API.
- Async errors aren't universally caught by the global error handler on
  Express 4 — would add `express-async-errors` in a production version.