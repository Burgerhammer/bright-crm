import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RecordInfo {
  id: string;
  entityType: "Lead" | "Contact";
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface DuplicateGroup {
  matchType: string;
  matchValue: string;
  records: RecordInfo[];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
      },
    });

    const contacts = await prisma.contact.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        account: { select: { name: true } },
      },
    });

    // Build unified record list
    const allRecords: RecordInfo[] = [
      ...leads.map((l) => ({
        id: l.id,
        entityType: "Lead" as const,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        phone: l.phone,
        company: l.company,
      })),
      ...contacts.map((c) => ({
        id: c.id,
        entityType: "Contact" as const,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        company: c.account?.name || null,
      })),
    ];

    const groups: DuplicateGroup[] = [];
    const usedInGroup = new Set<string>(); // track "entityType-id" already grouped

    // 1. Email duplicates
    const emailMap = new Map<string, RecordInfo[]>();
    for (const record of allRecords) {
      if (record.email) {
        const key = record.email.trim().toLowerCase();
        if (!emailMap.has(key)) emailMap.set(key, []);
        emailMap.get(key)!.push(record);
      }
    }
    for (const [emailVal, records] of emailMap) {
      if (records.length > 1) {
        groups.push({
          matchType: "email",
          matchValue: emailVal,
          records,
        });
        for (const r of records) {
          usedInGroup.add(`${r.entityType}-${r.id}`);
        }
      }
    }

    // 2. Phone duplicates
    const phoneMap = new Map<string, RecordInfo[]>();
    for (const record of allRecords) {
      if (record.phone) {
        const key = record.phone.replace(/\D/g, "");
        if (key.length >= 7) {
          if (!phoneMap.has(key)) phoneMap.set(key, []);
          phoneMap.get(key)!.push(record);
        }
      }
    }
    for (const [phoneVal, records] of phoneMap) {
      if (records.length > 1) {
        // Only add records not already grouped by email
        const ungrouped = records.filter(
          (r) => !usedInGroup.has(`${r.entityType}-${r.id}`)
        );
        if (ungrouped.length > 1) {
          groups.push({
            matchType: "phone",
            matchValue: phoneVal,
            records,
          });
          for (const r of records) {
            usedInGroup.add(`${r.entityType}-${r.id}`);
          }
        } else if (records.length > 1) {
          // Still show the group with all records even if some were in email groups
          groups.push({
            matchType: "phone",
            matchValue: phoneVal,
            records,
          });
        }
      }
    }

    // 3. Name duplicates (exact firstName + lastName)
    const nameMap = new Map<string, RecordInfo[]>();
    for (const record of allRecords) {
      const key = `${record.firstName.trim().toLowerCase()}|${record.lastName.trim().toLowerCase()}`;
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key)!.push(record);
    }
    for (const [nameVal, records] of nameMap) {
      if (records.length > 1) {
        const ungrouped = records.filter(
          (r) => !usedInGroup.has(`${r.entityType}-${r.id}`)
        );
        if (ungrouped.length > 1) {
          const [first, last] = nameVal.split("|");
          groups.push({
            matchType: "name",
            matchValue: `${first} ${last}`,
            records,
          });
          for (const r of records) {
            usedInGroup.add(`${r.entityType}-${r.id}`);
          }
        }
      }
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Failed to scan duplicates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
