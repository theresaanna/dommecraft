import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SlugProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await prisma.user.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!user) {
    redirect("/dashboard");
  }

  redirect(`/users/${user.id}`);
}
