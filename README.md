# Bright CRM

A modern, open-source CRM built with Next.js. Customizable pipelines, industry presets, and built-in integrations for email, calendar, phone, and SMS.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![SQLite](https://img.shields.io/badge/Database-SQLite-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Leads, Contacts, Accounts, Deals** — Full CRUD with detail pages, notes, and activity tracking
- **Customizable Pipelines** — Create and configure deal stages with win probabilities and colors
- **Kanban Board** — Drag-and-drop deal pipeline view
- **Industry Presets** — 8 preset configurations (General Sales, HRT & Supplements, Real Estate, SaaS, Recruiting, Insurance, Healthcare, Consulting) applied during first-time setup
- **Reports & Dashboard** — Pipeline metrics, conversion rates, revenue charts
- **Authentication** — Built-in auth with NextAuth.js (credentials provider, JWT sessions)
- **Clean Professional UI** — Dark blue nav, tab bar, cards, tables, and badges

### Integrations

- **Google (Gmail + Calendar)** — Send emails, view inbox, schedule meetings via OAuth2
- **Twilio (Phone + SMS)** — Click-to-call, send SMS, call logging
- **Dialpad (Cloud Phone + SMS)** — Native OAuth2 integration with embedded Mini Dialer CTI, AI call recaps, cloud calling, and SMS
- **Visual Dialpad** — Built-in phone widget with number pad, call states, and recent calls (works without any integration configured)

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repo
git clone https://github.com/Burgerhammer/bright-crm.git
cd bright-crm

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and set at minimum:
#   NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
#   NEXTAUTH_URL=http://localhost:3000

# Push the database schema
npx prisma db push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and choose an industry preset to get started.

### Demo Data (Optional)

Seed the database with HRT & Supplements demo data (patients, clinics, deals):

```bash
npm run db:seed:hrt
```

Login with:
- **Email:** kati@example.com
- **Password:** password123

### Docker

Run it with Docker for always-on access (great for a home server or Mac mini):

```bash
git clone https://github.com/Burgerhammer/bright-crm.git
cd bright-crm

# Create .env
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" > .env
echo "NEXTAUTH_URL=http://YOUR_LAN_IP:3000" >> .env

# Build and start
docker compose up -d --build

# One-time: sync Prisma schema to the SQLite database volume
# (Run again after schema changes)
docker compose run --rm migrate
```

Access from any device on your network at `http://YOUR_LAN_IP:3000`.

Notes:
- For LAN/self-hosting via IP/hostname, the default `docker-compose.yml` enables `AUTH_TRUST_HOST=true` to avoid Auth.js "UntrustedHost" errors.
- Data persists in the `crm-data` Docker volume.

## Deploy to a VPS (Always-On)

For access from anywhere (not just your local network), deploy to a VPS. Two recommended options:

### Option A: Railway (Zero-Ops)

The fastest way to deploy — no servers, no SSH, no Docker knowledge needed.

1. Go to [railway.com](https://railway.com) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub Repo**
3. Select `Burgerhammer/bright-crm` (or your fork)
4. Add these environment variables in the Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | Your Railway URL (e.g., `https://bright-crm-production.up.railway.app`) |
   | `DATABASE_URL` | `file:/app/data/bright.db` |

5. Railway auto-detects the Dockerfile, builds, and deploys
6. Add a persistent volume mounted at `/app/data` (Settings → Volumes) so your database survives redeploys

Railway gives you a public HTTPS URL automatically. ~$5/mo on the Starter plan.

### Option B: Hetzner VPS (Full Control)

Best value for a dedicated server. ~$4/mo for a CX22 (2 vCPU, 4GB RAM).

**1. Create a server**

Sign up at [hetzner.com/cloud](https://www.hetzner.com/cloud/), create a CX22 server with Ubuntu 24.04, and note the IP address.

**2. SSH in and install Docker**

```bash
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com | sh
```

**3. Clone and run**

```bash
git clone https://github.com/Burgerhammer/bright-crm.git
cd bright-crm

# Create .env
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" > .env
echo "NEXTAUTH_URL=http://YOUR_SERVER_IP:3000" >> .env

# Build and start (detached)
docker compose up -d
```

Your CRM is now live at `http://YOUR_SERVER_IP:3000` from any device.

**4. Add HTTPS with a domain (optional)**

If you have a domain, point it to your server IP, then add Caddy as a reverse proxy:

```bash
apt install -y caddy

# Edit /etc/caddy/Caddyfile:
# crm.yourdomain.com {
#     reverse_proxy localhost:3000
# }

systemctl restart caddy
```

Caddy auto-provisions SSL certificates. Update `NEXTAUTH_URL` in `.env` to `https://crm.yourdomain.com` and restart:

```bash
docker compose down && docker compose up -d
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite path (default: `file:./dev.db`) or Postgres URL |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `NEXTAUTH_URL` | Yes | Your app URL (e.g., `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth2 for Gmail + Calendar |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth2 secret |
| `TWILIO_ACCOUNT_SID` | No | Twilio for phone + SMS |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | Your Twilio phone number |
| `DIALPAD_CLIENT_ID` | No | Dialpad OAuth2 for cloud phone |
| `DIALPAD_CLIENT_SECRET` | No | Dialpad OAuth2 secret |
| `DIALPAD_CTI_CLIENT_ID` | No | Dialpad Mini Dialer embed (optional) |

Integrations are optional — the CRM works fully without them.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:seed` | Seed default demo data |
| `npm run db:seed:hrt` | Seed HRT & Supplements demo data |
| `npm run db:reset` | Reset database and reseed |
| `npm run db:reset:hrt` | Reset database with HRT demo data |

## Backups & Updates

### Backup

```bash
# One-time backup
./scripts/backup.sh

# Backups are saved to ./backups/ with timestamps
# Keeps the last 30 automatically
```

### Scheduled Backups (cron)

Run daily at 2am:

```bash
crontab -e
# Add this line (adjust the path):
0 2 * * * cd /path/to/bright-crm && ./scripts/backup.sh >> /var/log/bright-crm-backup.log 2>&1
```

### Update

Pulls latest code, backs up the database first, then rebuilds:

```bash
./scripts/update.sh
```

### Restore

```bash
# List available backups
./scripts/restore.sh

# Restore a specific backup
./scripts/restore.sh backups/bright-crm_2026-03-05_02-00-00.db
```

All three scripts work with both Docker and local installs.

## Switching to Postgres

Change `DATABASE_URL` in `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/brightcrm"
```

Update `prisma/schema.prisma` provider from `sqlite` to `postgresql`, then run `npx prisma db push`.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4
- **Database:** Prisma ORM + SQLite (switchable to Postgres)
- **Auth:** NextAuth.js v5 (credentials provider, JWT)
- **Icons:** Lucide React
- **Charts:** Recharts

## Project Structure

```
src/
  app/
    (auth)/          # Login, register, setup pages
    (crm)/           # Main CRM pages (dashboard, leads, contacts, etc.)
    api/             # API routes (CRUD, integrations)
  components/
    integrations/    # Dialpad, email composer, SMS, call buttons
    layout/          # TopNav, Sidebar
  lib/
    auth.ts          # NextAuth configuration
    prisma.ts        # Prisma client
    dialpad.ts       # Dialpad API client
    google.ts        # Google APIs client
    twilio.ts        # Twilio SDK wrapper
    presets.ts       # Industry preset definitions
prisma/
  schema.prisma      # Database schema
  seed.ts            # Default seed data
  seed-hrt-demo.ts   # HRT demo seed data
```

## License

MIT
