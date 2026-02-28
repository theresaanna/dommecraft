import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ContractsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const contracts = await prisma.contract.findMany({
    where: { subId: id, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Contracts
      </h2>
      {contracts.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No contracts yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {contracts.map((contract) => (
            <li
              key={contract.id}
              className="rounded-md border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {contract.title}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    contract.status === "ACTIVE"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : contract.status === "DRAFT"
                        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        : contract.status === "EXPIRED"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }`}
                >
                  {contract.status}
                </span>
              </div>
              {(contract.startDate || contract.endDate) && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {contract.startDate &&
                    `From ${contract.startDate.toLocaleDateString()}`}
                  {contract.startDate && contract.endDate && " "}
                  {contract.endDate &&
                    `to ${contract.endDate.toLocaleDateString()}`}
                </p>
              )}
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                Created {contract.createdAt.toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
