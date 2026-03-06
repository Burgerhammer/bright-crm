import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export async function getClaudeClient(userId: string): Promise<Anthropic | null> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: "anthropic" } },
  });

  const apiKey = integration?.accessToken;
  if (!apiKey) return null;

  return new Anthropic({ apiKey });
}

export async function getCrmContext(
  entityType?: string,
  entityId?: string
): Promise<string> {
  const parts: string[] = [];

  if (entityType && entityId) {
    switch (entityType) {
      case "lead": {
        const lead = await prisma.lead.findUnique({
          where: { id: entityId },
          include: {
            owner: { select: { name: true } },
            notes: { orderBy: { createdAt: "desc" }, take: 5 },
            activities: { orderBy: { createdAt: "desc" }, take: 5 },
            tags: true,
          },
        });
        if (lead) {
          parts.push(`Currently viewing Lead: ${lead.firstName} ${lead.lastName}`);
          parts.push(`Company: ${lead.company || "N/A"}, Email: ${lead.email || "N/A"}, Phone: ${lead.phone || "N/A"}`);
          parts.push(`Status: ${lead.status}, Rating: ${lead.rating || "N/A"}, Source: ${lead.source || "N/A"}`);
          parts.push(`Owner: ${lead.owner?.name || "Unassigned"}`);
          if (lead.description) parts.push(`Description: ${lead.description}`);
          if (lead.tags.length > 0) parts.push(`Tags: ${lead.tags.map(t => t.name).join(", ")}`);
          if (lead.notes.length > 0) {
            parts.push("Recent Notes:");
            lead.notes.forEach(n => parts.push(`  - ${n.body}`));
          }
          if (lead.activities.length > 0) {
            parts.push("Recent Activities:");
            lead.activities.forEach(a => parts.push(`  - [${a.type}] ${a.subject} (${a.status})`));
          }
        }
        break;
      }
      case "contact": {
        const contact = await prisma.contact.findUnique({
          where: { id: entityId },
          include: {
            account: { select: { name: true } },
            owner: { select: { name: true } },
            deals: { include: { stage: { select: { name: true } } }, take: 5 },
            notes: { orderBy: { createdAt: "desc" }, take: 5 },
            activities: { orderBy: { createdAt: "desc" }, take: 5 },
            tags: true,
          },
        });
        if (contact) {
          parts.push(`Currently viewing Contact: ${contact.firstName} ${contact.lastName}`);
          parts.push(`Title: ${contact.title || "N/A"}, Department: ${contact.department || "N/A"}`);
          parts.push(`Email: ${contact.email || "N/A"}, Phone: ${contact.phone || "N/A"}, Mobile: ${contact.mobile || "N/A"}`);
          parts.push(`Account: ${contact.account?.name || "N/A"}, Owner: ${contact.owner?.name || "Unassigned"}`);
          if (contact.description) parts.push(`Description: ${contact.description}`);
          if (contact.tags.length > 0) parts.push(`Tags: ${contact.tags.map(t => t.name).join(", ")}`);
          if (contact.deals.length > 0) {
            parts.push("Related Deals:");
            contact.deals.forEach(d => parts.push(`  - ${d.name} (${d.stage?.name || "N/A"}) - $${d.amount?.toLocaleString() || "0"}`));
          }
          if (contact.notes.length > 0) {
            parts.push("Recent Notes:");
            contact.notes.forEach(n => parts.push(`  - ${n.body}`));
          }
          if (contact.activities.length > 0) {
            parts.push("Recent Activities:");
            contact.activities.forEach(a => parts.push(`  - [${a.type}] ${a.subject} (${a.status})`));
          }
        }
        break;
      }
      case "account": {
        const account = await prisma.account.findUnique({
          where: { id: entityId },
          include: {
            owner: { select: { name: true } },
            contacts: { select: { firstName: true, lastName: true, title: true }, take: 10 },
            deals: { include: { stage: { select: { name: true } } }, take: 5 },
            notes: { orderBy: { createdAt: "desc" }, take: 5 },
            tags: true,
          },
        });
        if (account) {
          parts.push(`Currently viewing Account: ${account.name}`);
          parts.push(`Industry: ${account.industry || "N/A"}, Type: ${account.type || "N/A"}`);
          parts.push(`Website: ${account.website || "N/A"}, Phone: ${account.phone || "N/A"}`);
          parts.push(`Employees: ${account.employees || "N/A"}, Annual Revenue: ${account.annualRevenue ? "$" + account.annualRevenue.toLocaleString() : "N/A"}`);
          parts.push(`Owner: ${account.owner?.name || "Unassigned"}`);
          if (account.description) parts.push(`Description: ${account.description}`);
          if (account.tags.length > 0) parts.push(`Tags: ${account.tags.map(t => t.name).join(", ")}`);
          if (account.contacts.length > 0) {
            parts.push("Contacts:");
            account.contacts.forEach(c => parts.push(`  - ${c.firstName} ${c.lastName} (${c.title || "N/A"})`));
          }
          if (account.deals.length > 0) {
            parts.push("Deals:");
            account.deals.forEach(d => parts.push(`  - ${d.name} (${d.stage?.name || "N/A"}) - $${d.amount?.toLocaleString() || "0"}`));
          }
          if (account.notes.length > 0) {
            parts.push("Recent Notes:");
            account.notes.forEach(n => parts.push(`  - ${n.body}`));
          }
        }
        break;
      }
      case "deal": {
        const deal = await prisma.deal.findUnique({
          where: { id: entityId },
          include: {
            stage: { select: { name: true, probability: true } },
            pipeline: { select: { name: true } },
            account: { select: { name: true } },
            contact: { select: { firstName: true, lastName: true } },
            owner: { select: { name: true } },
            notes: { orderBy: { createdAt: "desc" }, take: 5 },
            activities: { orderBy: { createdAt: "desc" }, take: 5 },
            tags: true,
          },
        });
        if (deal) {
          parts.push(`Currently viewing Deal: ${deal.name}`);
          parts.push(`Amount: ${deal.amount ? "$" + deal.amount.toLocaleString() : "N/A"}`);
          parts.push(`Stage: ${deal.stage?.name || "N/A"} (${deal.stage?.probability || 0}% probability)`);
          parts.push(`Pipeline: ${deal.pipeline?.name || "N/A"}`);
          parts.push(`Close Date: ${deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : "N/A"}`);
          parts.push(`Account: ${deal.account?.name || "N/A"}, Contact: ${deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : "N/A"}`);
          parts.push(`Owner: ${deal.owner?.name || "Unassigned"}`);
          if (deal.description) parts.push(`Description: ${deal.description}`);
          if (deal.tags.length > 0) parts.push(`Tags: ${deal.tags.map(t => t.name).join(", ")}`);
          if (deal.notes.length > 0) {
            parts.push("Recent Notes:");
            deal.notes.forEach(n => parts.push(`  - ${n.body}`));
          }
          if (deal.activities.length > 0) {
            parts.push("Recent Activities:");
            deal.activities.forEach(a => parts.push(`  - [${a.type}] ${a.subject} (${a.status})`));
          }
        }
        break;
      }
    }
  }

  // Add pipeline summary
  const pipelineStats = await prisma.deal.groupBy({
    by: ["stageId"],
    _count: true,
    _sum: { amount: true },
  });

  if (pipelineStats.length > 0) {
    const stages = await prisma.stage.findMany({
      where: { id: { in: pipelineStats.map(s => s.stageId) } },
      select: { id: true, name: true, order: true },
      orderBy: { order: "asc" },
    });

    const stageMap = new Map(stages.map(s => [s.id, s.name]));
    parts.push("\nPipeline Summary:");
    pipelineStats.forEach(s => {
      const name = stageMap.get(s.stageId) || "Unknown";
      parts.push(`  ${name}: ${s._count} deals, $${(s._sum.amount || 0).toLocaleString()}`);
    });
  }

  // Recent task summary
  const openTasks = await prisma.task.count({
    where: { status: { in: ["Open", "In Progress"] } },
  });
  const overdueTasks = await prisma.task.count({
    where: {
      status: { in: ["Open", "In Progress"] },
      dueDate: { lt: new Date() },
    },
  });
  parts.push(`\nTasks: ${openTasks} open, ${overdueTasks} overdue`);

  return parts.join("\n");
}

export const SYSTEM_PROMPT = `You are an AI assistant built into Bright CRM. You help users manage their sales pipeline, leads, contacts, accounts, deals, and tasks.

You have access to the user's CRM data provided as context. Use it to give specific, actionable advice.

Your capabilities:
- Draft personalized emails and outreach messages
- Summarize contact/deal history for meeting prep
- Analyze pipeline health and suggest next actions
- Help prioritize tasks and follow-ups
- Suggest strategies for moving deals forward
- Help with data entry and record management

Be concise, professional, and actionable. When drafting emails, match a warm but professional tone. When giving advice, be specific to the data you see.`;
