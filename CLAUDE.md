# Bright CRM

Open-source AI-native CRM. Works fully standalone — AI features are optional (BYOK or Claude Code MCP).

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4
- Prisma ORM + SQLite (`prisma/dev.db`, switchable to Postgres)
- NextAuth.js v5 (credentials, JWT)
- Anthropic SDK (BYOK) + MCP Server for Claude Code
- Lucide React icons, Recharts

## MCP Server

`mcp-server/` gives Claude direct database access. Rebuild after changes:

```bash
cd mcp-server && npm install && npm run build
```

20 tools: `list_leads`, `get_lead`, `create_lead`, `update_lead`, `list_contacts`, `list_accounts`, `list_deals`, `advance_deal`, `add_note`, `log_activity`, `get_icp_profiles`, `list_sequences`, `enroll_in_sequence`, `list_pending_approvals`, `approve_action`, `reject_action`, `get_agent_configs`, `toggle_agent`, `create_task`, `get_dashboard_stats`

## Development

```bash
npm install && npm run dev       # Start dev server
npm run db:push                  # Push schema changes
npm run db:seed                  # Seed demo data
npm run db:studio                # Prisma Studio GUI
```

## Key Paths
- `src/app/(crm)/` — 31 CRM pages (dashboard, leads, contacts, accounts, deals, tasks, autopilot, settings)
- `src/app/api/` — 85 API routes
- `src/components/` — 16 components (CoPilot, AiActions, TagManager, BulkActionBar, Attachments, CustomFields, DuplicateWarning, integrations, layout)
- `src/lib/` — 9 modules (prisma, auth, claude, audit, google, twilio, dialpad, presets, utils)
- `prisma/schema.prisma` — 25 database models
- `mcp-server/` — MCP server (20 tools)

## User-Invocable Skills

### /prospect
Find new leads matching the CRM's Ideal Customer Profile. Read the ICP profiles from the CRM using `get_icp_profiles`, then generate leads that match the criteria. For each lead, check for duplicates and create them using `create_lead`. Log your work as agent activities.

Steps:
1. Call `get_icp_profiles` to read all active ICP configurations
2. For each profile, analyze the criteria (industries, company size, roles, regions, keywords)
3. Generate 5-10 realistic, plausible prospect leads per profile
4. For each lead, call `create_lead` with all available fields (firstName, lastName, email, company, title, source="AI Prospector", rating, description explaining why they match the ICP)
5. Summarize results: how many leads created, any duplicates skipped

### /enrich
Enrich leads that have missing data. Find leads with incomplete information and fill in missing fields using your knowledge.

Steps:
1. Call `list_leads` with limit=20 to get recent leads
2. Identify leads missing key fields (title, company, city, state, description)
3. For each incomplete lead, infer plausible data based on available information
4. Call `update_lead` to fill in missing fields
5. Summarize what was enriched

### /pipeline-review
Analyze all deals in the pipeline and recommend actions — which deals to advance, which are at risk, and what next steps to take.

Steps:
1. Call `get_dashboard_stats` for overall CRM health
2. Call `list_deals` to get all deals with stage info
3. For each deal, analyze:
   - How long it's been in the current stage
   - Whether it should advance based on available evidence
   - Whether it's at risk (stale, missing activity)
4. Provide recommendations with reasoning
5. Ask before calling `advance_deal` on any specific deals

### /approve-queue
Review and process all pending agent actions that need human approval.

Steps:
1. Call `list_pending_approvals` to see all pending actions
2. Present each one with its details (what agent proposed, why, metadata)
3. For each action, recommend approve or reject with reasoning
4. Ask for confirmation before calling `approve_action` or `reject_action`

### /crm-status
Get a full status report of the CRM — pipeline health, lead counts, task status, agent activity, and pending approvals.

Steps:
1. Call `get_dashboard_stats` for comprehensive stats
2. Call `get_agent_configs` to check agent status
3. Call `list_pending_approvals` to check approval queue
4. Present a clear summary with key metrics and any items needing attention

### /outreach
Draft and manage outreach for leads enrolled in sequences. Personalize email templates based on lead/contact data and CRM context.

Steps:
1. Call `list_sequences` to see active outreach sequences
2. For leads needing outreach, get their details with `get_lead`
3. Draft personalized emails based on the sequence templates and lead data
4. Present drafts for review before any action
