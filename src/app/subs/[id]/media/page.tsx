import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function MediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const mediaItems = await prisma.mediaItem.findMany({
    where: { subId: id, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Media
      </h2>
      {mediaItems.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No media items yet.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mediaItems.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                {item.title || "Untitled"}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {item.fileType}
                {item.fileSize && ` · ${Math.round(item.fileSize / 1024)} KB`}
              </p>
              {item.description && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.description}
                </p>
              )}
              {item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                {item.createdAt.toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
