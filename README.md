# Bright CRM

A modern, open-source, AI-native CRM built with Next.js. Fully functional as a standalone CRM, with optional AI superpowers — from a Claude CoPilot sidebar to fully autonomous AI agents that prospect, enrich, outreach, and manage your pipeline.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![SQLite](https://img.shields.io/badge/Database-SQLite-green) ![Claude](https://img.shields.io/badge/AI-Claude-orange) ![MCP](https://img.shields.io/badge/MCP-Compatible-purple) ![License](https://img.shields.io/badge/License-MIT-yellow)

## What Makes Bright CRM Different

Most CRMs bolt on AI as an afterthought. Bright CRM is built from the ground up with three tiers of AI integration — all optional:

1. **No AI** — A fully functional CRM with leads, contacts, deals, pipeline, tasks, and reporting
2. **AI CoPilot** — Add your Anthropic API key and get a chat sidebar, email drafting, meeting prep, deal insights, and tag suggestions
3. **Autonomous Agents** — Five AI agents that prospect, enrich data, run outreach sequences, and advance deals through your pipeline — with human approval gates
4. **Claude Code Integration** — MCP server + skills let Claude Code act as the AI brain using your Max subscription

## Features

### Core CRM
- **Leads** — Full lifecycle management with status tracking, ratings, sources, and lead conversion to contacts/accounts/deals
- **Contacts** — Track people with account associations, deal relationships, and communication history
- **Accounts** — Company records with employee count, revenue, industry, and linked contacts/deals
- **Deals** — Opportunity tracking with customizable pipeline stages, probability, and close dates
- **Tasks** — Task management with priorities, due dates (with time picker), and entity linking
- **Kanban Board** — Drag-and-drop deal pipeline view
- **Customizable Pipelines** — Create and configure deal stages with win probabilities and colors
- **Industry Presets** — 8 presets (General Sales, HRT & Supplements, Real Estate, SaaS, Recruiting, Insurance, Healthcare, Consulting) applied during first-time setup
- **Reports & Dashboard** — Pipeline metrics, conversion rates, revenue charts, activity summaries

### Productivity
- **Global Search** — Instant search across leads, contacts, accounts, and deals from the top nav
- **Bulk Actions** — Multi-select records for bulk delete, status updates, rating changes, and owner assignment
- **Tags & Labels** — Color-coded tags across all entity types with inline creation
- **Email Templates** — Reusable templates with variable placeholders (`{{firstName}}`, `{{company}}`, etc.)
- **Custom Fields** — Define text, number, date, dropdown, and boolean fields for any entity type
- **File Attachments** — Drag-and-drop file uploads on leads, contacts, accounts, and deals
- **Notifications** — Task due/overdue alerts with bell icon and unread count
- **Audit Log** — Full history of all changes — who changed what, when, with field-level diffs
- **Duplicate Detection** — Scan for duplicate leads/contacts by email, phone, or name
- **CSV Import/Export** — Bulk import from CSV with field mapping, export any entity list
- **Notes & Activities** — Add notes and log calls, emails, meetings on any record

### Integrations
- **Google (Gmail + Calendar)** — Send emails, view inbox, schedule meetings via OAuth2
- **Twilio (Phone + SMS)** — Click-to-call, send SMS, call logging
- **Dialpad (Cloud Phone + SMS)** — OAuth2 integration with embedded Mini Dialer CTI, AI call recaps, cloud calling, and SMS
- **Visual Dialpad** — Built-in phone widget with number pad, call states, and recent calls (works without any integration)

### AI CoPilot (Optional — BYOK)
Add your Anthropic API key in Settings > Integrations to unlock:
- **Chat Sidebar** — Streaming AI chat with full CRM context awareness (knows what page you're on, your pipeline, tasks)
- **Draft Emails** — AI-generated personalized emails based on lead/contact/deal data
- **Meeting Prep** — Auto-generated briefing docs with relationship history and talking points
- **Deal Insights** — AI analysis of deal health, risk factors, and recommended next steps
- **Tag Suggestions** — AI recommends tags based on record content

### Autonomous Agents (Optional — Autopilot)
Five AI agents that run your sales pipeline:

| Agent | What It Does |
|-------|-------------|
| **Prospector** | Finds new leads matching your Ideal Customer Profile (ICP) |
| **Enricher** | Fills in missing data on leads (title, company, location) |
| **Outreach** | Sends personalized multi-step email sequences |
| **Follow-up** | Manages replies and follow-up cadences |
| **Pipeline Mover** | Analyzes deals and recommends stage advancement or flags at-risk |

Each agent has:
- Enable/disable toggle
- Approval mode (require human review) or auto mode
- Configurable schedule (hourly, every 6 hours, daily)
- "Run Now" manual trigger
- Real-time activity feed with approve/reject inline

Supporting features:
- **ICP Configuration** — Define ideal customer profiles with target industries, company sizes, roles, regions, and keywords
- **Outreach Sequences** — Multi-step email sequence builder with variable placeholders and enrollment management
- **Approval Queue** — Filterable queue with bulk approve/reject for pending agent actions

### Claude Code / MCP Integration (Optional)
For Claude Code or Claude Desktop users — Claude becomes the AI brain using your Max subscription:
- **MCP Server** — 20 tools giving Claude direct read/write access to the CRM database
- **Skills** — Slash commands (`/prospect`, `/enrich`, `/pipeline-review`, `/approve-queue`, `/crm-status`, `/outreach`)
- No separate API key needed — uses your existing Claude subscription

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

### Enable AI Features (Optional)

1. Go to **Settings > Integrations**
2. Add your **Anthropic API key**
3. The CoPilot sidebar and AI action buttons appear automatically
4. Navigate to **Autopilot** to configure and enable autonomous agents

### Enable Claude Code Integration (Optional)

```bash
# Build the MCP server
cd mcp-server && npm install && npm run build && cd ..
```

Next time you open Claude Code in the `bright-crm` directory, it loads the MCP server automatically (configured in `.mcp.json`). Use skills like:

```
/prospect          # Generate leads matching your ICP
/enrich            # Fill missing data on leads
/pipeline-review   # Analyze deals and recommend actions
/approve-queue     # Review pending agent actions
/crm-status        # Full CRM health report
/outreach          # Draft personalized outreach emails
```

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
2. Click **New Project** > **Deploy from GitHub Repo**
3. Select `Burgerhammer/bright-crm` (or your fork)
4. Add these environment variables in the Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | Your Railway URL (e.g., `https://bright-crm-production.up.railway.app`) |
   | `DATABASE_URL` | `file:/app/data/bright.db` |

5. Railway auto-detects the Dockerfile, builds, and deploys
6. Add a persistent volume mounted at `/app/data` (Settings > Volumes) so your database survives redeploys

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

All integrations are optional — the CRM works fully without them. AI features are enabled by adding an Anthropic API key through the web UI (Settings > Integrations), not through environment variables.

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
- **AI:** Anthropic SDK (BYOK) + MCP Server
- **Icons:** Lucide React
- **Charts:** Recharts

## Project Structure

```
src/
  app/
    (auth)/              # Login, register, setup pages
    (crm)/               # Main CRM pages
      dashboard/         # Dashboard with metrics
      leads/             # Lead list, detail, create
      contacts/          # Contact list, detail, create
      accounts/          # Account list, detail, create
      deals/             # Deal list, detail, create, kanban
      tasks/             # Task list, detail, create
      autopilot/         # AI agent control center
        icp/             # Ideal Customer Profile config
        sequences/       # Outreach sequence builder
        approvals/       # Agent action approval queue
      import/            # CSV import
      reports/           # Reports & analytics
      settings/          # Profile, pipelines, integrations, tags,
                         # email templates, custom fields, duplicates, audit log
    api/                 # 85 API routes
      leads/             # CRUD, bulk, tags, convert
      contacts/          # CRUD, bulk, tags
      accounts/          # CRUD, bulk, tags
      deals/             # CRUD, bulk, tags
      tasks/             # CRUD
      agents/            # Agent config, activity, stats, ICP,
                         # sequences, enrollments, agent runners, approvals
      ai/                # Chat, draft email, meeting prep, insights, suggest tags
      integrations/      # Google, Twilio, Dialpad, Anthropic
      ...                # Search, tags, templates, audit log, notifications, etc.
  components/
    CoPilot.tsx          # AI chat sidebar
    AiActions.tsx        # AI action buttons (draft email, meeting prep, etc.)
    TagManager.tsx       # Tag management with inline creation
    BulkActionBar.tsx    # Multi-select action bar
    Attachments.tsx      # Drag-and-drop file uploads
    CustomFields.tsx     # Custom field renderer
    DuplicateWarning.tsx # Duplicate detection warnings
    integrations/        # Dialpad, email composer, SMS, call buttons
    layout/              # TopNav, Sidebar
  lib/
    prisma.ts            # Prisma client
    auth.ts              # NextAuth configuration
    claude.ts            # Claude AI client + CRM context builder
    audit.ts             # Audit logging
    google.ts            # Google APIs client
    twilio.ts            # Twilio SDK wrapper
    dialpad.ts           # Dialpad API client
    presets.ts           # Industry preset definitions
    utils.ts             # Shared utilities
prisma/
  schema.prisma          # Database schema (25 models)
  seed.ts                # Default seed data
  seed-hrt-demo.ts       # HRT demo seed data
mcp-server/              # MCP server for Claude Code integration
  src/index.ts           # 20 MCP tools for CRM access
```

## License

MIT
