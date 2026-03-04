import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DiscoverPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const photos = await prisma.galleryPhoto.findMany({
    where: {
      user: { role: "DOMME" },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      fileUrl: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          slug: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pt-16 pb-40">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Discover
        </h1>
      </div>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Recent photos from Dommes
      </p>

      {photos.length === 0 ? (
        <div className="mt-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No photos yet.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((photo) => {
            const profileHref = photo.user.slug
              ? `/u/${photo.user.slug}`
              : `/users/${photo.user.id}`;
            return (
              <div
                key={photo.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white/60 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <img
                  src={photo.fileUrl}
                  alt="Gallery photo"
                  className="aspect-square w-full object-cover"
                />
                <div className="px-3 py-2">
                  <Link
                    href={profileHref}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    {photo.user.avatarUrl ? (
                      <img
                        src={photo.user.avatarUrl}
                        alt={photo.user.name || "User"}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {(photo.user.name || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {photo.user.name || "Unnamed"}
                    </span>
                  </Link>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(photo.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
