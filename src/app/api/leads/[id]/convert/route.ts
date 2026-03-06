import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { createDeal, dealName, dealAmount, dealCloseDate } = body;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (lead.status === "Converted") {
      return NextResponse.json({ error: "Lead is already converted" }, { status: 400 });
    }

    // Create Account from lead's company (or use lead name as fallback)
    const account = await prisma.account.create({
      data: {
        name: lead.company || `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        country: lead.country,
        description: lead.description,
        ownerId: session.user.id,
      },
    });

    // Create Contact from lead data, linked to account
    const contact = await prisma.contact.create({
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        title: lead.title,
        accountId: account.id,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        country: lead.country,
        description: lead.description,
        ownerId: session.user.id,
      },
    });

    // Optionally create a Deal
    let deal = null;
    if (createDeal) {
      // Find default pipeline and its first stage
      const defaultPipeline = await prisma.pipeline.findFirst({
        where: { isDefault: true },
        include: { stages: { orderBy: { order: "asc" }, take: 1 } },
      });

      if (!defaultPipeline || defaultPipeline.stages.length === 0) {
        // If no default pipeline, find any pipeline
        const anyPipeline = await prisma.pipeline.findFirst({
          include: { stages: { orderBy: { order: "asc" }, take: 1 } },
        });

        if (anyPipeline && anyPipeline.stages.length > 0) {
          deal = await prisma.deal.create({
            data: {
              name: dealName || `${lead.firstName} ${lead.lastName} - Deal`,
              amount: dealAmount ? parseFloat(dealAmount) : null,
              closeDate: dealCloseDate ? new Date(dealCloseDate) : null,
              pipelineId: anyPipeline.id,
              stageId: anyPipeline.stages[0].id,
              accountId: account.id,
              contactId: contact.id,
              ownerId: session.user.id,
            },
          });
        }
      } else {
        deal = await prisma.deal.create({
          data: {
            name: dealName || `${lead.firstName} ${lead.lastName} - Deal`,
            amount: dealAmount ? parseFloat(dealAmount) : null,
            closeDate: dealCloseDate ? new Date(dealCloseDate) : null,
            pipelineId: defaultPipeline.id,
            stageId: defaultPipeline.stages[0].id,
            accountId: account.id,
            contactId: contact.id,
            ownerId: session.user.id,
          },
        });
      }
    }

    // Update lead status to Converted with references
    await prisma.lead.update({
      where: { id },
      data: {
        status: "Converted",
        convertedContactId: contact.id,
        convertedAccountId: account.id,
        ...(deal && { convertedDealId: deal.id }),
      },
    });

    return NextResponse.json({
      contact: { id: contact.id, name: `${contact.firstName} ${contact.lastName}` },
      account: { id: account.id, name: account.name },
      deal: deal ? { id: deal.id, name: deal.name } : null,
    });
  } catch (error) {
    console.error("Failed to convert lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
