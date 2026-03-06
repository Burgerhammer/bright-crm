import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), "public", attachment.filepath);
      await unlink(filePath);
    } catch {
      // File may already be deleted, continue with DB cleanup
      console.warn(`File not found on disk: ${attachment.filepath}`);
    }

    // Delete DB record
    await prisma.attachment.delete({ where: { id } });

    return NextResponse.json({ message: "Attachment deleted" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
