import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ leads: [], contacts: [], accounts: [], deals: [] });
    }

    const [leads, contacts, accounts, deals] = await Promise.all([
      prisma.lead.findMany({
        where: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { company: { contains: q } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.account.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { industry: { contains: q } },
            { website: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          industry: true,
          website: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.deal.findMany({
        where: {
          OR: [
            { name: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          amount: true,
          stage: { select: { name: true } },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      leads: leads.map((l) => ({
        id: l.id,
        label: `${l.firstName} ${l.lastName}`,
        type: "lead" as const,
        subtitle: l.company || l.email || "",
      })),
      contacts: contacts.map((c) => ({
        id: c.id,
        label: `${c.firstName} ${c.lastName}`,
        type: "contact" as const,
        subtitle: c.email || c.phone || "",
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        label: a.name,
        type: "account" as const,
        subtitle: a.industry || a.website || "",
      })),
      deals: deals.map((d) => ({
        id: d.id,
        label: d.name,
        type: "deal" as const,
        subtitle: d.stage?.name
          ? `${d.stage.name}${d.amount ? ` - $${d.amount.toLocaleString()}` : ""}`
          : d.amount
            ? `$${d.amount.toLocaleString()}`
            : "",
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
