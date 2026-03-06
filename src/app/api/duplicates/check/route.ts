import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface DuplicateMatch {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  matchType: string;
  confidence: "high" | "medium";
  entityType: "Lead" | "Contact";
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, firstName, lastName, email, phone, company, excludeId } = body as {
      entityType: "Lead" | "Contact";
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      excludeId?: string;
    };

    if (!entityType || (entityType !== "Lead" && entityType !== "Contact")) {
      return NextResponse.json(
        { error: "entityType must be 'Lead' or 'Contact'" },
        { status: 400 }
      );
    }

    const duplicates: DuplicateMatch[] = [];
    const seenIds = new Set<string>();

    // Search both leads and contacts for duplicates
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

    // Normalize for comparison
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedFirstName = firstName?.trim().toLowerCase();
    const normalizedLastName = lastName?.trim().toLowerCase();
    const normalizedPhone = phone?.replace(/\D/g, "");
    const normalizedCompany = company?.trim().toLowerCase();

    // Check leads
    for (const lead of leads) {
      if (excludeId && entityType === "Lead" && lead.id === excludeId) continue;

      const leadEmail = lead.email?.trim().toLowerCase();
      const leadFirstName = lead.firstName?.trim().toLowerCase();
      const leadLastName = lead.lastName?.trim().toLowerCase();
      const leadPhone = lead.phone?.replace(/\D/g, "");
      const leadCompany = lead.company?.trim().toLowerCase();

      // Exact email match (highest confidence)
      if (normalizedEmail && leadEmail && normalizedEmail === leadEmail) {
        if (!seenIds.has(`lead-${lead.id}`)) {
          seenIds.add(`lead-${lead.id}`);
          duplicates.push({
            id: lead.id,
            name: `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            matchType: "email",
            confidence: "high",
            entityType: "Lead",
          });
        }
        continue;
      }

      // Same firstName + lastName (high confidence)
      if (
        normalizedFirstName &&
        normalizedLastName &&
        leadFirstName &&
        leadLastName &&
        normalizedFirstName === leadFirstName &&
        normalizedLastName === leadLastName
      ) {
        if (!seenIds.has(`lead-${lead.id}`)) {
          seenIds.add(`lead-${lead.id}`);
          duplicates.push({
            id: lead.id,
            name: `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            matchType: "name",
            confidence: "high",
            entityType: "Lead",
          });
        }
        continue;
      }

      // Same phone number (high confidence)
      if (normalizedPhone && normalizedPhone.length >= 7 && leadPhone && normalizedPhone === leadPhone) {
        if (!seenIds.has(`lead-${lead.id}`)) {
          seenIds.add(`lead-${lead.id}`);
          duplicates.push({
            id: lead.id,
            name: `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            matchType: "phone",
            confidence: "high",
            entityType: "Lead",
          });
        }
        continue;
      }

      // Same lastName + company (medium confidence)
      if (
        normalizedLastName &&
        normalizedCompany &&
        leadLastName &&
        leadCompany &&
        normalizedLastName === leadLastName &&
        normalizedCompany === leadCompany
      ) {
        if (!seenIds.has(`lead-${lead.id}`)) {
          seenIds.add(`lead-${lead.id}`);
          duplicates.push({
            id: lead.id,
            name: `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            matchType: "lastName+company",
            confidence: "medium",
            entityType: "Lead",
          });
        }
      }
    }

    // Check contacts
    for (const contact of contacts) {
      if (excludeId && entityType === "Contact" && contact.id === excludeId) continue;

      const contactEmail = contact.email?.trim().toLowerCase();
      const contactFirstName = contact.firstName?.trim().toLowerCase();
      const contactLastName = contact.lastName?.trim().toLowerCase();
      const contactPhone = contact.phone?.replace(/\D/g, "");
      const contactCompany = contact.account?.name?.trim().toLowerCase();

      // Exact email match (highest confidence)
      if (normalizedEmail && contactEmail && normalizedEmail === contactEmail) {
        if (!seenIds.has(`contact-${contact.id}`)) {
          seenIds.add(`contact-${contact.id}`);
          duplicates.push({
            id: contact.id,
            name: `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            phone: contact.phone,
            company: contact.account?.name || null,
            matchType: "email",
            confidence: "high",
            entityType: "Contact",
          });
        }
        continue;
      }

      // Same firstName + lastName (high confidence)
      if (
        normalizedFirstName &&
        normalizedLastName &&
        contactFirstName &&
        contactLastName &&
        normalizedFirstName === contactFirstName &&
        normalizedLastName === contactLastName
      ) {
        if (!seenIds.has(`contact-${contact.id}`)) {
          seenIds.add(`contact-${contact.id}`);
          duplicates.push({
            id: contact.id,
            name: `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            phone: contact.phone,
            company: contact.account?.name || null,
            matchType: "name",
            confidence: "high",
            entityType: "Contact",
          });
        }
        continue;
      }

      // Same phone number (high confidence)
      if (normalizedPhone && normalizedPhone.length >= 7 && contactPhone && normalizedPhone === contactPhone) {
        if (!seenIds.has(`contact-${contact.id}`)) {
          seenIds.add(`contact-${contact.id}`);
          duplicates.push({
            id: contact.id,
            name: `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            phone: contact.phone,
            company: contact.account?.name || null,
            matchType: "phone",
            confidence: "high",
            entityType: "Contact",
          });
        }
        continue;
      }

      // Same lastName + company (medium confidence)
      if (
        normalizedLastName &&
        normalizedCompany &&
        contactLastName &&
        contactCompany &&
        normalizedLastName === contactLastName &&
        normalizedCompany === contactCompany
      ) {
        if (!seenIds.has(`contact-${contact.id}`)) {
          seenIds.add(`contact-${contact.id}`);
          duplicates.push({
            id: contact.id,
            name: `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            phone: contact.phone,
            company: contact.account?.name || null,
            matchType: "lastName+company",
            confidence: "medium",
            entityType: "Contact",
          });
        }
      }
    }

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("Failed to check duplicates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
