import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserProfileClient from "./UserProfileClient";
import PhotoGallery from "./PhotoGallery";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/dashboard");
  }

  const isOwnProfile = session.user.id === id;

  const galleryPhotos = await prisma.galleryPhoto.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileUrl: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name || "User avatar"}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            {(user.name || "?")[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {user.name || "Unnamed User"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {user.role} · Joined{" "}
            {user.createdAt.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </section>

      {!isOwnProfile && (
        <UserProfileClient
          targetUserId={id}
          targetUserName={user.name || "User"}
        />
      )}

      <PhotoGallery
        photos={galleryPhotos.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
        }))}
        userId={id}
        isOwnProfile={isOwnProfile}
      />
    </div>
  );
}
