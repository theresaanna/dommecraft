import { prisma } from "@/lib/prisma";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length < MIN_LENGTH) {
    return { valid: false, error: `Slug must be at least ${MIN_LENGTH} characters` };
  }
  if (slug.length > MAX_LENGTH) {
    return { valid: false, error: `Slug must be at most ${MAX_LENGTH} characters` };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      valid: false,
      error: "Slug can only contain lowercase letters, numbers, and hyphens",
    };
  }
  return { valid: true };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "user";

  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${randomSuffix()}`;
    const existing = await prisma.user.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  // Fallback: use longer random suffix
  return `${base}-${randomSuffix()}${randomSuffix()}`;
}
