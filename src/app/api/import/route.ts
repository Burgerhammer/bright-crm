import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && text[i + 1] === "\n")) {
        row.push(current.trim());
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
        current = "";
        if (char === "\r") i++;
      } else {
        current += char;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell !== "")) rows.push(row);
  }
  return rows;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ");
}

function getVal(
  headerMap: Record<string, number>,
  row: string[],
  ...keys: string[]
): string {
  for (const key of keys) {
    const idx = headerMap[normalizeHeader(key)];
    if (idx !== undefined && row[idx] !== undefined) {
      return row[idx].trim();
    }
  }
  return "";
}

const VALID_TYPES = ["contacts", "leads", "accounts", "deals"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error:
            "Invalid type. Must be one of: contacts, leads, accounts, deals",
        },
        { status: 400 }
      );
    }

    const text = await file.text();
    const parsed = parseCSV(text);

    if (parsed.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    const headerRow = parsed[0];
    const headerMap: Record<string, number> = {};
    headerRow.forEach((h, i) => {
      headerMap[normalizeHeader(h)] = i;
    });

    const dataRows = parsed.slice(1);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const ownerId = session.user.id;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // 1-indexed, accounting for header

      try {
        if (type === "contacts") {
          const firstName = getVal(headerMap, row, "First Name");
          const lastName = getVal(headerMap, row, "Last Name");

          if (!firstName || !lastName) {
            skipped++;
            errors.push(
              `Row ${rowNum}: Skipped - missing required field (First Name or Last Name)`
            );
            continue;
          }

          // Look up account by name
          let accountId: string | null = null;
          const accountName = getVal(headerMap, row, "Account");
          if (accountName) {
            const account = await prisma.account.findFirst({
              where: { name: { equals: accountName } },
            });
            if (account) {
              accountId = account.id;
            }
          }

          await prisma.contact.create({
            data: {
              firstName,
              lastName,
              email: getVal(headerMap, row, "Email") || null,
              phone: getVal(headerMap, row, "Phone") || null,
              mobile: getVal(headerMap, row, "Mobile") || null,
              title: getVal(headerMap, row, "Title") || null,
              department: getVal(headerMap, row, "Department") || null,
              accountId,
              address: getVal(headerMap, row, "Address") || null,
              city: getVal(headerMap, row, "City") || null,
              state: getVal(headerMap, row, "State") || null,
              zip: getVal(headerMap, row, "Zip") || null,
              country: getVal(headerMap, row, "Country") || null,
              description: getVal(headerMap, row, "Description") || null,
              ownerId,
            },
          });
          imported++;
        } else if (type === "leads") {
          const firstName = getVal(headerMap, row, "First Name");
          const lastName = getVal(headerMap, row, "Last Name");

          if (!firstName || !lastName) {
            skipped++;
            errors.push(
              `Row ${rowNum}: Skipped - missing required field (First Name or Last Name)`
            );
            continue;
          }

          await prisma.lead.create({
            data: {
              firstName,
              lastName,
              email: getVal(headerMap, row, "Email") || null,
              phone: getVal(headerMap, row, "Phone") || null,
              company: getVal(headerMap, row, "Company") || null,
              title: getVal(headerMap, row, "Title") || null,
              status: getVal(headerMap, row, "Status") || "New",
              source: getVal(headerMap, row, "Source") || null,
              rating: getVal(headerMap, row, "Rating") || null,
              address: getVal(headerMap, row, "Address") || null,
              city: getVal(headerMap, row, "City") || null,
              state: getVal(headerMap, row, "State") || null,
              zip: getVal(headerMap, row, "Zip") || null,
              country: getVal(headerMap, row, "Country") || null,
              description: getVal(headerMap, row, "Description") || null,
              ownerId,
            },
          });
          imported++;
        } else if (type === "accounts") {
          const name = getVal(headerMap, row, "Name");

          if (!name) {
            skipped++;
            errors.push(
              `Row ${rowNum}: Skipped - missing required field (Name)`
            );
            continue;
          }

          const employeesStr = getVal(headerMap, row, "Employees");
          const revenueStr = getVal(headerMap, row, "Annual Revenue");

          await prisma.account.create({
            data: {
              name,
              industry: getVal(headerMap, row, "Industry") || null,
              type: getVal(headerMap, row, "Type") || null,
              website: getVal(headerMap, row, "Website") || null,
              phone: getVal(headerMap, row, "Phone") || null,
              address: getVal(headerMap, row, "Address") || null,
              city: getVal(headerMap, row, "City") || null,
              state: getVal(headerMap, row, "State") || null,
              zip: getVal(headerMap, row, "Zip") || null,
              country: getVal(headerMap, row, "Country") || null,
              description: getVal(headerMap, row, "Description") || null,
              employees: employeesStr ? parseInt(employeesStr, 10) || null : null,
              annualRevenue: revenueStr ? parseFloat(revenueStr) || null : null,
              ownerId,
            },
          });
          imported++;
        } else if (type === "deals") {
          const name = getVal(headerMap, row, "Name");

          if (!name) {
            skipped++;
            errors.push(
              `Row ${rowNum}: Skipped - missing required field (Name)`
            );
            continue;
          }

          // Look up stage by name
          const stageName = getVal(headerMap, row, "Stage");
          let stageId: string | null = null;
          let pipelineId: string | null = null;

          // Look up pipeline by name first
          const pipelineName = getVal(headerMap, row, "Pipeline");
          if (pipelineName) {
            const pipeline = await prisma.pipeline.findFirst({
              where: { name: { equals: pipelineName } },
            });
            if (pipeline) {
              pipelineId = pipeline.id;
            }
          }

          if (stageName) {
            const stageWhere: Record<string, unknown> = {
              name: { equals: stageName },
            };
            if (pipelineId) {
              stageWhere.pipelineId = pipelineId;
            }
            const stage = await prisma.stage.findFirst({
              where: stageWhere,
              include: { pipeline: true },
            });
            if (stage) {
              stageId = stage.id;
              if (!pipelineId) {
                pipelineId = stage.pipelineId;
              }
            }
          }

          // If we still don't have stage or pipeline, use defaults
          if (!stageId || !pipelineId) {
            const defaultPipeline = await prisma.pipeline.findFirst({
              where: { isDefault: true },
              include: { stages: { orderBy: { order: "asc" }, take: 1 } },
            });
            if (defaultPipeline && defaultPipeline.stages.length > 0) {
              if (!pipelineId) pipelineId = defaultPipeline.id;
              if (!stageId) stageId = defaultPipeline.stages[0].id;
            } else {
              // Try any pipeline
              const anyPipeline = await prisma.pipeline.findFirst({
                include: { stages: { orderBy: { order: "asc" }, take: 1 } },
              });
              if (anyPipeline && anyPipeline.stages.length > 0) {
                if (!pipelineId) pipelineId = anyPipeline.id;
                if (!stageId) stageId = anyPipeline.stages[0].id;
              } else {
                skipped++;
                errors.push(
                  `Row ${rowNum}: Skipped - no pipeline/stage found`
                );
                continue;
              }
            }
          }

          // Look up account by name
          let accountId: string | null = null;
          const accountName = getVal(headerMap, row, "Account");
          if (accountName) {
            const account = await prisma.account.findFirst({
              where: { name: { equals: accountName } },
            });
            if (account) {
              accountId = account.id;
            }
          }

          // Look up contact by first + last name
          let contactId: string | null = null;
          const contactName = getVal(headerMap, row, "Contact");
          if (contactName) {
            const parts = contactName.trim().split(/\s+/);
            if (parts.length >= 2) {
              const contactFirstName = parts[0];
              const contactLastName = parts.slice(1).join(" ");
              const contact = await prisma.contact.findFirst({
                where: {
                  firstName: { equals: contactFirstName },
                  lastName: { equals: contactLastName },
                },
              });
              if (contact) {
                contactId = contact.id;
              }
            }
          }

          const amountStr = getVal(headerMap, row, "Amount");
          const probStr = getVal(headerMap, row, "Probability");
          const closeDateStr = getVal(headerMap, row, "Close Date");

          await prisma.deal.create({
            data: {
              name,
              amount: amountStr ? parseFloat(amountStr) || null : null,
              closeDate: closeDateStr ? new Date(closeDateStr) : null,
              probability: probStr ? parseInt(probStr, 10) : null,
              type: getVal(headerMap, row, "Type") || null,
              source: getVal(headerMap, row, "Source") || null,
              description: getVal(headerMap, row, "Description") || null,
              stageId,
              pipelineId,
              accountId,
              contactId,
              ownerId,
            },
          });
          imported++;
        }
      } catch (err) {
        skipped++;
        const message =
          err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${rowNum}: ${message}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
