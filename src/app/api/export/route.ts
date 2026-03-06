import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

const HEADERS: Record<string, string[]> = {
  contacts: [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Mobile",
    "Title",
    "Department",
    "Account",
    "Address",
    "City",
    "State",
    "Zip",
    "Country",
    "Description",
    "Owner",
  ],
  leads: [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Company",
    "Title",
    "Status",
    "Source",
    "Rating",
    "Address",
    "City",
    "State",
    "Zip",
    "Country",
    "Description",
    "Owner",
  ],
  accounts: [
    "Name",
    "Industry",
    "Type",
    "Website",
    "Phone",
    "Address",
    "City",
    "State",
    "Zip",
    "Country",
    "Description",
    "Employees",
    "Annual Revenue",
    "Owner",
  ],
  deals: [
    "Name",
    "Amount",
    "Close Date",
    "Probability",
    "Type",
    "Source",
    "Stage",
    "Pipeline",
    "Account",
    "Contact",
    "Description",
    "Owner",
  ],
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const template = searchParams.get("template");

    if (!type || !HEADERS[type]) {
      return NextResponse.json(
        { error: "Invalid type. Must be one of: contacts, leads, accounts, deals" },
        { status: 400 }
      );
    }

    const headers = HEADERS[type];

    // If template mode, return just headers
    if (template === "true") {
      const csv = headers.map(escapeCSV).join(",");
      const today = new Date().toISOString().split("T")[0];
      return new Response(csv + "\n", {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}-template-${today}.csv"`,
        },
      });
    }

    let rows: string[][] = [];

    if (type === "contacts") {
      const contacts = await prisma.contact.findMany({
        include: {
          account: { select: { name: true } },
          owner: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      rows = contacts.map((c) => [
        c.firstName,
        c.lastName,
        c.email || "",
        c.phone || "",
        c.mobile || "",
        c.title || "",
        c.department || "",
        c.account?.name || "",
        c.address || "",
        c.city || "",
        c.state || "",
        c.zip || "",
        c.country || "",
        c.description || "",
        c.owner?.name || "",
      ]);
    } else if (type === "leads") {
      const leads = await prisma.lead.findMany({
        include: {
          owner: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      rows = leads.map((l) => [
        l.firstName,
        l.lastName,
        l.email || "",
        l.phone || "",
        l.company || "",
        l.title || "",
        l.status,
        l.source || "",
        l.rating || "",
        l.address || "",
        l.city || "",
        l.state || "",
        l.zip || "",
        l.country || "",
        l.description || "",
        l.owner?.name || "",
      ]);
    } else if (type === "accounts") {
      const accounts = await prisma.account.findMany({
        include: {
          owner: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      rows = accounts.map((a) => [
        a.name,
        a.industry || "",
        a.type || "",
        a.website || "",
        a.phone || "",
        a.address || "",
        a.city || "",
        a.state || "",
        a.zip || "",
        a.country || "",
        a.description || "",
        a.employees !== null ? String(a.employees) : "",
        a.annualRevenue !== null ? String(a.annualRevenue) : "",
        a.owner?.name || "",
      ]);
    } else if (type === "deals") {
      const deals = await prisma.deal.findMany({
        include: {
          stage: { select: { name: true } },
          pipeline: { select: { name: true } },
          account: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
          owner: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      rows = deals.map((d) => [
        d.name,
        d.amount !== null ? String(d.amount) : "",
        d.closeDate ? d.closeDate.toISOString().split("T")[0] : "",
        d.probability !== null ? String(d.probability) : "",
        d.type || "",
        d.source || "",
        d.stage?.name || "",
        d.pipeline?.name || "",
        d.account?.name || "",
        d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : "",
        d.description || "",
        d.owner?.name || "",
      ]);
    }

    const csv = toCSV(headers, rows);
    const today = new Date().toISOString().split("T")[0];

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-export-${today}.csv"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
