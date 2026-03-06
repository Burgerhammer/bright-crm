import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function ContactsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const contacts = await prisma.contact.findMany({
    include: {
      account: true,
      owner: true,
    },
    orderBy: { lastName: "asc" },
  });

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--bc-text)]">Contacts</h1>
        <Link href="/contacts/new" className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Contact
        </Link>
      </div>

      {/* Contacts Table */}
      <div className="bc-card">
        <div className="bc-section-header">
          All Contacts ({contacts.length})
        </div>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden sm:table-cell">Title</th>
                <th>Account Name</th>
                <th className="hidden sm:table-cell">Email</th>
                <th>Phone</th>
                <th className="hidden lg:table-cell">Owner</th>
                <th className="hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[var(--bc-text-light)]">
                    No contacts yet.{" "}
                    <Link href="/contacts/new" className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)]">
                      Create your first contact
                    </Link>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)] font-medium"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell">{contact.title || "-"}</td>
                    <td>
                      {contact.account ? (
                        <Link
                          href={`/accounts/${contact.account.id}`}
                          className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)]"
                        >
                          {contact.account.name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="hidden sm:table-cell">{contact.email || "-"}</td>
                    <td>{contact.phone || "-"}</td>
                    <td className="hidden lg:table-cell">{contact.owner?.name || "-"}</td>
                    <td className="hidden lg:table-cell">{formatDate(contact.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
