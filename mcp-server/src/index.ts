#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "../../prisma/dev.db");

function getDb(): Database.Database {
  return new Database(DB_PATH, { readonly: false });
}

// ── Helper to run a query and return rows ──

function query(sql: string, params: unknown[] = []): unknown[] {
  const db = getDb();
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } finally {
    db.close();
  }
}

function run(sql: string, params: unknown[] = []): Database.RunResult {
  const db = getDb();
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } finally {
    db.close();
  }
}

function generateId(): string {
  // cuid-like ID
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "c";
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ── Create MCP Server ──

const server = new McpServer({
  name: "bright-crm",
  version: "1.0.0",
});

// ════════════════════════════════════════
//  RESOURCES — CRM data Claude can read
// ════════════════════════════════════════

server.resource("pipeline-summary", "crm://pipeline/summary", async () => {
  const stages = query(`
    SELECT s.name, s."order", s.probability, COUNT(d.id) as dealCount,
           COALESCE(SUM(d.amount), 0) as totalAmount
    FROM Stage s
    LEFT JOIN Deal d ON d.stageId = s.id
    GROUP BY s.id
    ORDER BY s."order" ASC
  `) as { name: string; order: number; probability: number; dealCount: number; totalAmount: number }[];

  const lines = stages.map(
    (s) => `${s.name} (${s.probability}%): ${s.dealCount} deals, $${s.totalAmount.toLocaleString()}`
  );

  return { contents: [{ uri: "crm://pipeline/summary", text: lines.join("\n") || "No pipeline data" }] };
});

server.resource("icp-profiles", "crm://icp/profiles", async () => {
  const profiles = query("SELECT * FROM IcpProfile WHERE isActive = 1 ORDER BY createdAt DESC");
  return {
    contents: [{
      uri: "crm://icp/profiles",
      text: JSON.stringify(profiles, null, 2),
    }],
  };
});

server.resource("agent-status", "crm://agents/status", async () => {
  const configs = query("SELECT * FROM AgentConfig ORDER BY createdAt ASC");
  const pending = query("SELECT COUNT(*) as count FROM AgentActivity WHERE status = 'pending_approval'") as { count: number }[];
  return {
    contents: [{
      uri: "crm://agents/status",
      text: JSON.stringify({ configs, pendingApprovals: pending[0]?.count || 0 }, null, 2),
    }],
  };
});

// ════════════════════════════════════════
//  TOOLS — CRM operations Claude can call
// ════════════════════════════════════════

// ── Leads ──

server.tool(
  "list_leads",
  "List leads with optional filters",
  {
    status: z.string().optional().describe("Filter by status: New, Contacted, Qualified, Unqualified, Converted"),
    rating: z.string().optional().describe("Filter by rating: Hot, Warm, Cold"),
    limit: z.number().optional().describe("Max results (default 25)"),
    search: z.string().optional().describe("Search by name, email, or company"),
  },
  async ({ status, rating, limit, search }) => {
    let sql = "SELECT id, firstName, lastName, email, phone, company, title, status, rating, source, city, state, createdAt FROM Lead WHERE 1=1";
    const params: unknown[] = [];

    if (status) { sql += " AND status = ?"; params.push(status); }
    if (rating) { sql += " AND rating = ?"; params.push(rating); }
    if (search) {
      sql += " AND (firstName || ' ' || lastName LIKE ? OR email LIKE ? OR company LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    sql += ` ORDER BY createdAt DESC LIMIT ?`;
    params.push(limit || 25);

    const leads = query(sql, params);
    return { content: [{ type: "text", text: JSON.stringify(leads, null, 2) }] };
  }
);

server.tool(
  "get_lead",
  "Get full details of a specific lead including notes, activities, and tags",
  { id: z.string().describe("Lead ID") },
  async ({ id }) => {
    const lead = query("SELECT * FROM Lead WHERE id = ?", [id]);
    if (!lead.length) return { content: [{ type: "text", text: "Lead not found" }] };

    const notes = query("SELECT * FROM Note WHERE leadId = ? ORDER BY createdAt DESC LIMIT 10", [id]);
    const activities = query("SELECT * FROM Activity WHERE leadId = ? ORDER BY createdAt DESC LIMIT 10", [id]);
    const tags = query("SELECT t.* FROM Tag t JOIN _LeadToTag lt ON t.id = lt.B WHERE lt.A = ?", [id]);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ lead: lead[0], notes, activities, tags }, null, 2),
      }],
    };
  }
);

server.tool(
  "create_lead",
  "Create a new lead in the CRM",
  {
    firstName: z.string().describe("First name"),
    lastName: z.string().describe("Last name"),
    email: z.string().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    company: z.string().optional().describe("Company name"),
    title: z.string().optional().describe("Job title"),
    source: z.string().optional().describe("Lead source (e.g., AI Prospector, Web, Referral)"),
    rating: z.string().optional().describe("Rating: Hot, Warm, Cold"),
    status: z.string().optional().describe("Status (default: New)"),
    description: z.string().optional().describe("Description or notes about why this is a good prospect"),
    city: z.string().optional().describe("City"),
    state: z.string().optional().describe("State"),
    country: z.string().optional().describe("Country"),
  },
  async (params) => {
    // Check for duplicates by email
    if (params.email) {
      const existing = query("SELECT id, firstName, lastName FROM Lead WHERE email = ?", [params.email]);
      if (existing.length) {
        return {
          content: [{
            type: "text",
            text: `Duplicate found: Lead "${(existing[0] as { firstName: string; lastName: string }).firstName} ${(existing[0] as { firstName: string; lastName: string }).lastName}" already has email ${params.email}. Skipping creation.`,
          }],
        };
      }
    }

    const id = generateId();
    const now = new Date().toISOString();
    const owners = query("SELECT id FROM User LIMIT 1") as { id: string }[];
    const ownerId = owners[0]?.id || null;

    run(
      `INSERT INTO Lead (id, firstName, lastName, email, phone, company, title, source, rating, status, description, city, state, country, ownerId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, params.firstName, params.lastName,
        params.email || null, params.phone || null, params.company || null,
        params.title || null, params.source || "AI Prospector",
        params.rating || "Warm", params.status || "New",
        params.description || null, params.city || null,
        params.state || null, params.country || null,
        ownerId, now, now,
      ]
    );

    // Log agent activity
    run(
      `INSERT INTO AgentActivity (id, agentType, action, description, entityType, entityId, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(), "prospector", "found_lead",
        `Created lead: ${params.firstName} ${params.lastName} at ${params.company || "Unknown"}`,
        "Lead", id, "completed", now,
      ]
    );

    return {
      content: [{
        type: "text",
        text: `Created lead: ${params.firstName} ${params.lastName} (ID: ${id})`,
      }],
    };
  }
);

server.tool(
  "update_lead",
  "Update fields on an existing lead",
  {
    id: z.string().describe("Lead ID"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    rating: z.string().optional(),
    description: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  },
  async ({ id, ...fields }) => {
    const existing = query("SELECT id FROM Lead WHERE id = ?", [id]);
    if (!existing.length) return { content: [{ type: "text", text: "Lead not found" }] };

    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (sets.length === 0) return { content: [{ type: "text", text: "No fields to update" }] };

    sets.push("updatedAt = ?");
    params.push(new Date().toISOString());
    params.push(id);

    run(`UPDATE Lead SET ${sets.join(", ")} WHERE id = ?`, params);

    return { content: [{ type: "text", text: `Updated lead ${id}: ${Object.keys(fields).filter(k => fields[k as keyof typeof fields] !== undefined).join(", ")}` }] };
  }
);

// ── Contacts ──

server.tool(
  "list_contacts",
  "List contacts with optional search",
  {
    search: z.string().optional().describe("Search by name, email, or phone"),
    limit: z.number().optional().describe("Max results (default 25)"),
  },
  async ({ search, limit }) => {
    let sql = "SELECT c.id, c.firstName, c.lastName, c.email, c.phone, c.title, c.department, a.name as accountName FROM Contact c LEFT JOIN Account a ON c.accountId = a.id WHERE 1=1";
    const params: unknown[] = [];
    if (search) {
      sql += " AND (c.firstName || ' ' || c.lastName LIKE ? OR c.email LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s);
    }
    sql += ` ORDER BY c.createdAt DESC LIMIT ?`;
    params.push(limit || 25);
    const contacts = query(sql, params);
    return { content: [{ type: "text", text: JSON.stringify(contacts, null, 2) }] };
  }
);

// ── Accounts ──

server.tool(
  "list_accounts",
  "List accounts with optional search",
  {
    search: z.string().optional().describe("Search by name or industry"),
    limit: z.number().optional().describe("Max results (default 25)"),
  },
  async ({ search, limit }) => {
    let sql = "SELECT id, name, industry, type, website, phone, employees, annualRevenue FROM Account WHERE 1=1";
    const params: unknown[] = [];
    if (search) {
      sql += " AND (name LIKE ? OR industry LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s);
    }
    sql += ` ORDER BY createdAt DESC LIMIT ?`;
    params.push(limit || 25);
    const accounts = query(sql, params);
    return { content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }] };
  }
);

// ── Deals ──

server.tool(
  "list_deals",
  "List deals with stage and pipeline info",
  {
    limit: z.number().optional().describe("Max results (default 25)"),
  },
  async ({ limit }) => {
    const deals = query(
      `SELECT d.id, d.name, d.amount, d.closeDate, d.probability,
              s.name as stageName, s."order" as stageOrder, p.name as pipelineName,
              a.name as accountName,
              c.firstName || ' ' || c.lastName as contactName
       FROM Deal d
       LEFT JOIN Stage s ON d.stageId = s.id
       LEFT JOIN Pipeline p ON d.pipelineId = p.id
       LEFT JOIN Account a ON d.accountId = a.id
       LEFT JOIN Contact c ON d.contactId = c.id
       ORDER BY d.updatedAt DESC LIMIT ?`,
      [limit || 25]
    );
    return { content: [{ type: "text", text: JSON.stringify(deals, null, 2) }] };
  }
);

server.tool(
  "advance_deal",
  "Move a deal to the next stage in its pipeline",
  {
    dealId: z.string().describe("Deal ID"),
    reason: z.string().describe("Reason for advancing"),
  },
  async ({ dealId, reason }) => {
    const deals = query(
      `SELECT d.*, s.name as stageName, s."order" as stageOrder, p.id as pipelineId
       FROM Deal d JOIN Stage s ON d.stageId = s.id JOIN Pipeline p ON d.pipelineId = p.id
       WHERE d.id = ?`,
      [dealId]
    ) as { id: string; name: string; stageId: string; stageName: string; stageOrder: number; pipelineId: string }[];

    if (!deals.length) return { content: [{ type: "text", text: "Deal not found" }] };
    const deal = deals[0];

    const nextStages = query(
      `SELECT id, name, probability FROM Stage WHERE pipelineId = ? AND "order" = ?`,
      [deal.pipelineId, deal.stageOrder + 1]
    ) as { id: string; name: string; probability: number }[];

    if (!nextStages.length) return { content: [{ type: "text", text: `Deal "${deal.name}" is already at the final stage` }] };
    const nextStage = nextStages[0];

    run("UPDATE Deal SET stageId = ?, probability = ?, updatedAt = ? WHERE id = ?", [
      nextStage.id, nextStage.probability, new Date().toISOString(), dealId,
    ]);

    // Log activity
    run(
      `INSERT INTO AgentActivity (id, agentType, action, description, entityType, entityId, status, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(), "pipeline_mover", "advanced_deal",
        `Advanced "${deal.name}" from ${deal.stageName} to ${nextStage.name}. Reason: ${reason}`,
        "Deal", dealId, "completed",
        JSON.stringify({ dealId, previousStage: deal.stageName, newStage: nextStage.name, reason }),
        new Date().toISOString(),
      ]
    );

    return {
      content: [{
        type: "text",
        text: `Advanced "${deal.name}" from ${deal.stageName} to ${nextStage.name}`,
      }],
    };
  }
);

// ── Notes ──

server.tool(
  "add_note",
  "Add a note to a lead, contact, account, or deal",
  {
    body: z.string().describe("Note content"),
    leadId: z.string().optional().describe("Lead ID to attach note to"),
    contactId: z.string().optional().describe("Contact ID to attach note to"),
    accountId: z.string().optional().describe("Account ID to attach note to"),
    dealId: z.string().optional().describe("Deal ID to attach note to"),
  },
  async ({ body, leadId, contactId, accountId, dealId }) => {
    const id = generateId();
    const now = new Date().toISOString();
    const owners = query("SELECT id FROM User LIMIT 1") as { id: string }[];

    run(
      `INSERT INTO Note (id, body, leadId, contactId, accountId, dealId, ownerId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body, leadId || null, contactId || null, accountId || null, dealId || null, owners[0]?.id || null, now, now]
    );

    return { content: [{ type: "text", text: `Note added (ID: ${id})` }] };
  }
);

// ── Activities ──

server.tool(
  "log_activity",
  "Log a CRM activity (call, email, meeting, task, note)",
  {
    type: z.enum(["call", "email", "meeting", "task", "note"]).describe("Activity type"),
    subject: z.string().describe("Activity subject"),
    description: z.string().optional().describe("Activity description"),
    status: z.string().optional().describe("Status (default: Completed)"),
    leadId: z.string().optional(),
    contactId: z.string().optional(),
    accountId: z.string().optional(),
    dealId: z.string().optional(),
  },
  async ({ type, subject, description, status, leadId, contactId, accountId, dealId }) => {
    const id = generateId();
    const now = new Date().toISOString();
    const owners = query("SELECT id FROM User LIMIT 1") as { id: string }[];

    run(
      `INSERT INTO Activity (id, type, subject, description, status, leadId, contactId, accountId, dealId, ownerId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, subject, description || null, status || "Completed", leadId || null, contactId || null, accountId || null, dealId || null, owners[0]?.id || null, now, now]
    );

    return { content: [{ type: "text", text: `Activity logged: [${type}] ${subject}` }] };
  }
);

// ── ICP Profiles ──

server.tool(
  "get_icp_profiles",
  "Get all active Ideal Customer Profile configurations",
  {},
  async () => {
    const profiles = query("SELECT * FROM IcpProfile WHERE isActive = 1 ORDER BY createdAt DESC");
    return { content: [{ type: "text", text: JSON.stringify(profiles, null, 2) }] };
  }
);

// ── Outreach Sequences ──

server.tool(
  "list_sequences",
  "List all outreach sequences with enrollment counts",
  {},
  async () => {
    const sequences = query(`
      SELECT s.id, s.name, s.description, s.status, s.steps,
             COUNT(e.id) as totalEnrollments,
             SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) as activeEnrollments
      FROM OutreachSequence s
      LEFT JOIN OutreachEnrollment e ON e.sequenceId = s.id
      GROUP BY s.id
      ORDER BY s.createdAt DESC
    `);
    return { content: [{ type: "text", text: JSON.stringify(sequences, null, 2) }] };
  }
);

server.tool(
  "enroll_in_sequence",
  "Enroll a lead or contact in an outreach sequence",
  {
    sequenceId: z.string().describe("Sequence ID"),
    entityType: z.enum(["Lead", "Contact"]).describe("Entity type"),
    entityId: z.string().describe("Entity ID"),
  },
  async ({ sequenceId, entityType, entityId }) => {
    // Check if already enrolled
    const existing = query(
      "SELECT id FROM OutreachEnrollment WHERE sequenceId = ? AND entityType = ? AND entityId = ?",
      [sequenceId, entityType, entityId]
    );
    if (existing.length) {
      return { content: [{ type: "text", text: "Already enrolled in this sequence" }] };
    }

    const id = generateId();
    const now = new Date().toISOString();

    // Get first step delay
    const seqs = query("SELECT steps FROM OutreachSequence WHERE id = ?", [sequenceId]) as { steps: string }[];
    if (!seqs.length) return { content: [{ type: "text", text: "Sequence not found" }] };

    const steps = JSON.parse(seqs[0].steps) as { delayDays: number }[];
    const firstDelay = steps.length > 0 ? (steps[0].delayDays || 0) : 0;
    const nextStepAt = new Date(Date.now() + firstDelay * 24 * 60 * 60 * 1000).toISOString();

    run(
      `INSERT INTO OutreachEnrollment (id, sequenceId, entityType, entityId, currentStep, status, enrolledAt, nextStepAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sequenceId, entityType, entityId, 0, "active", now, nextStepAt]
    );

    return { content: [{ type: "text", text: `Enrolled ${entityType} ${entityId} in sequence` }] };
  }
);

// ── Pending Approvals ──

server.tool(
  "list_pending_approvals",
  "List all agent actions awaiting human approval",
  {},
  async () => {
    const pending = query(
      "SELECT * FROM AgentActivity WHERE status = 'pending_approval' ORDER BY createdAt DESC LIMIT 50"
    );
    return { content: [{ type: "text", text: JSON.stringify(pending, null, 2) }] };
  }
);

server.tool(
  "approve_action",
  "Approve a pending agent action — executes the action (create lead, send email, advance deal)",
  {
    activityId: z.string().describe("Agent activity ID to approve"),
  },
  async ({ activityId }) => {
    const activities = query("SELECT * FROM AgentActivity WHERE id = ? AND status = 'pending_approval'", [activityId]) as {
      id: string; action: string; metadata: string | null;
    }[];

    if (!activities.length) {
      return { content: [{ type: "text", text: "Activity not found or not pending approval" }] };
    }

    const activity = activities[0];
    const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};

    if (activity.action === "found_lead") {
      const leadId = generateId();
      const now = new Date().toISOString();
      const owners = query("SELECT id FROM User LIMIT 1") as { id: string }[];

      run(
        `INSERT INTO Lead (id, firstName, lastName, email, phone, company, title, source, rating, status, description, ownerId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          leadId, metadata.firstName || "Unknown", metadata.lastName || "Unknown",
          metadata.email || null, metadata.phone || null, metadata.company || null,
          metadata.title || null, metadata.source || "AI Prospector",
          metadata.rating || "Warm", "New", metadata.description || null,
          owners[0]?.id || null, now, now,
        ]
      );

      run("UPDATE AgentActivity SET status = 'approved', entityId = ? WHERE id = ?", [leadId, activityId]);
      return { content: [{ type: "text", text: `Approved: Created lead ${metadata.firstName} ${metadata.lastName} (ID: ${leadId})` }] };
    }

    // Generic approval
    run("UPDATE AgentActivity SET status = 'approved' WHERE id = ?", [activityId]);
    return { content: [{ type: "text", text: `Approved activity ${activityId}` }] };
  }
);

server.tool(
  "reject_action",
  "Reject a pending agent action",
  {
    activityId: z.string().describe("Agent activity ID to reject"),
  },
  async ({ activityId }) => {
    const result = run("UPDATE AgentActivity SET status = 'rejected' WHERE id = ? AND status = 'pending_approval'", [activityId]);
    if (result.changes === 0) {
      return { content: [{ type: "text", text: "Activity not found or not pending approval" }] };
    }
    return { content: [{ type: "text", text: `Rejected activity ${activityId}` }] };
  }
);

// ── Agent Config ──

server.tool(
  "get_agent_configs",
  "Get configuration for all autonomous agents",
  {},
  async () => {
    const configs = query("SELECT * FROM AgentConfig ORDER BY createdAt ASC");
    return { content: [{ type: "text", text: JSON.stringify(configs, null, 2) }] };
  }
);

server.tool(
  "toggle_agent",
  "Enable or disable an autonomous agent",
  {
    agentType: z.enum(["prospector", "enricher", "outreach", "follow_up", "pipeline_mover"]),
    enabled: z.boolean().describe("true to enable, false to disable"),
  },
  async ({ agentType, enabled }) => {
    run("UPDATE AgentConfig SET enabled = ?, updatedAt = ? WHERE agentType = ?", [
      enabled ? 1 : 0, new Date().toISOString(), agentType,
    ]);
    return { content: [{ type: "text", text: `Agent "${agentType}" ${enabled ? "enabled" : "disabled"}` }] };
  }
);

// ── Tasks ──

server.tool(
  "create_task",
  "Create a CRM task",
  {
    title: z.string().describe("Task title"),
    description: z.string().optional().describe("Task description"),
    priority: z.enum(["High", "Medium", "Low"]).optional().describe("Priority (default: Medium)"),
    dueDate: z.string().optional().describe("Due date (ISO format)"),
    leadId: z.string().optional(),
    contactId: z.string().optional(),
    accountId: z.string().optional(),
    dealId: z.string().optional(),
  },
  async ({ title, description, priority, dueDate, leadId, contactId, accountId, dealId }) => {
    const id = generateId();
    const now = new Date().toISOString();
    const owners = query("SELECT id FROM User LIMIT 1") as { id: string }[];

    run(
      `INSERT INTO Task (id, title, description, status, priority, dueDate, leadId, contactId, accountId, dealId, ownerId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, title, description || null, "Open", priority || "Medium",
        dueDate || null, leadId || null, contactId || null,
        accountId || null, dealId || null, owners[0]?.id || null, now, now,
      ]
    );

    return { content: [{ type: "text", text: `Task created: "${title}" (ID: ${id})` }] };
  }
);

// ── Dashboard Stats ──

server.tool(
  "get_dashboard_stats",
  "Get CRM dashboard statistics — lead counts, deal pipeline value, task stats, recent activity",
  {},
  async () => {
    const leadsByStatus = query("SELECT status, COUNT(*) as count FROM Lead GROUP BY status");
    const dealsByStage = query(`
      SELECT s.name, COUNT(d.id) as count, COALESCE(SUM(d.amount), 0) as totalAmount
      FROM Stage s LEFT JOIN Deal d ON d.stageId = s.id
      GROUP BY s.id ORDER BY s."order"
    `);
    const taskStats = query(`
      SELECT status, COUNT(*) as count FROM Task GROUP BY status
    `);
    const overdueTasks = query(`
      SELECT COUNT(*) as count FROM Task WHERE status IN ('Open', 'In Progress') AND dueDate < datetime('now')
    `);
    const recentActivities = query(`
      SELECT type, subject, status, createdAt FROM Activity ORDER BY createdAt DESC LIMIT 10
    `);
    const agentStats = query(`
      SELECT agentType, action, COUNT(*) as count FROM AgentActivity
      WHERE createdAt >= datetime('now', '-7 days')
      GROUP BY agentType, action
    `);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          leadsByStatus, dealsByStage, taskStats,
          overdueTasks: (overdueTasks as { count: number }[])[0]?.count || 0,
          recentActivities, agentStats,
        }, null, 2),
      }],
    };
  }
);

// ── Start Server ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
