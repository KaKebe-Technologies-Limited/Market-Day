# Market Day Entry Management System

A fast, mobile-friendly entry management system for Market Day events.

---

## Quick Start (Local)

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and change ADMIN_PASSWORD if desired

# 3. Create the database and push schema
npx prisma db push

# 4. Generate Prisma client
npx prisma generate

# 5. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — registration page  
Open [http://localhost:3000/admin](http://localhost:3000/admin) — gate admin

Default admin password: `marketday2026`  
**Change this in `.env` before going live.**

---

## Deployment on Vercel (Recommended)

**Note:** Vercel uses serverless functions — SQLite won't persist between deploys. For production, use PlanetScale (free MySQL) or Turso (free SQLite edge DB).

### Option A: Vercel + Turso (Easiest SQLite upgrade)

1. Create free account at [turso.tech](https://turso.tech)
2. Create a database: `turso db create market-day`
3. Get URL + auth token: `turso db show --url market-day` and `turso db tokens create market-day`
4. Install Turso driver: `npm install @libsql/client`
5. Update `prisma/schema.prisma`:
   ```
   datasource db {
     provider = "sqlite"
     url      = env("TURSO_DATABASE_URL")
     relationMode = "prisma"
   }
   ```
6. Add to Vercel env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD`
7. Deploy: `npx vercel deploy`

### Option B: Railway (Simplest, SQLite works)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app), create new project from repo
3. Add env vars: `DATABASE_URL=file:./dev.db`, `ADMIN_PASSWORD=yourpassword`
4. Deploy — Railway persists the filesystem

---

## How It Works

### Registration Flow (`/`)

1. Attendee enters name + phone
2. System generates unique code (e.g. `MKD-A3BX9K`)
3. QR code generated and displayed
4. Attendee downloads or screenshots QR

### Gate Verification (`/admin`)

1. Staff opens `/admin` on their phone
2. Scan QR code (camera) or type code manually
3. System responds instantly:
   - 🟢 **VALID** → Let them in (auto-marked as used)
   - 🔴 **INVALID** → Code doesn't exist
   - 🔴 **ALREADY USED** → Duplicate attempt
   - 🟡 **NOT PAID** → Collect payment, then tap "Mark as Paid"
4. Walk-in tab for manual entries
5. Entries tab to see all registrations

### Internet Fallback

If internet fails at the gate:

- Switch to stamp/wristband-only entry
- System auto-syncs when connection returns

---

## Environment Variables

| Variable         | Description          | Default         |
| ---------------- | -------------------- | --------------- |
| `DATABASE_URL`   | SQLite database path | `file:./dev.db` |
| `ADMIN_PASSWORD` | Gate staff password  | `marketday2026` |

---

## API Reference

### POST `/api/register`

```json
{ "name": "Jane Doe", "phone": "0700123456" }
```

Returns: `{ name, code, qrDataUrl }`

### POST `/api/verify`

```json
{ "code": "MKD-A3BX9K" }
```

Returns: `{ status, message, name?, id? }`  
Status: `VALID | INVALID | ALREADY_USED | NOT_PAID | ERROR`

### POST `/api/admin/manual-entry` _(requires x-admin-password header)_

```json
{ "name": "John", "phone": "0701000000", "paid": true }
```

### POST `/api/admin/mark-paid` _(requires x-admin-password header)_

```json
{ "id": 42 }
```

### GET `/api/admin/entries` _(requires x-admin-password header)_

Returns last 100 entries.
