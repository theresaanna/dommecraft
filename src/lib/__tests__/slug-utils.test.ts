import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { validateSlug, generateUniqueSlug } from "@/lib/slug-utils";
import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.user.findUnique);

describe("validateSlug", () => {
  it("accepts a valid slug", () => {
    expect(validateSlug("alice-123")).toEqual({ valid: true });
  });

  it("accepts a slug with only letters", () => {
    expect(validateSlug("alice")).toEqual({ valid: true });
  });

  it("accepts a slug with only numbers", () => {
    expect(validateSlug("12345")).toEqual({ valid: true });
  });

  it("rejects slug shorter than 3 characters", () => {
    const result = validateSlug("ab");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 3/);
  });

  it("rejects slug longer than 30 characters", () => {
    const result = validateSlug("a".repeat(31));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at most 30/);
  });

  it("rejects slug with uppercase letters", () => {
    const result = validateSlug("Alice");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/lowercase/);
  });

  it("rejects slug with special characters", () => {
    const result = validateSlug("alice_bob");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/lowercase/);
  });

  it("rejects slug with leading hyphen", () => {
    const result = validateSlug("-alice");
    expect(result.valid).toBe(false);
  });

  it("rejects slug with trailing hyphen", () => {
    const result = validateSlug("alice-");
    expect(result.valid).toBe(false);
  });

  it("rejects slug with consecutive hyphens", () => {
    const result = validateSlug("alice--bob");
    expect(result.valid).toBe(false);
  });

  it("accepts exactly 3 characters", () => {
    expect(validateSlug("abc")).toEqual({ valid: true });
  });

  it("accepts exactly 30 characters", () => {
    expect(validateSlug("a".repeat(30))).toEqual({ valid: true });
  });
});

describe("generateUniqueSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a slug from the given name", async () => {
    mockFindUnique.mockResolvedValue(null);

    const slug = await generateUniqueSlug("Alice");
    expect(slug).toMatch(/^alice-[a-z0-9]{4}$/);
  });

  it("handles names with special characters", async () => {
    mockFindUnique.mockResolvedValue(null);

    const slug = await generateUniqueSlug("Alice & Bob!");
    expect(slug).toMatch(/^alice-bob-[a-z0-9]{4}$/);
  });

  it("uses 'user' as base when name is empty", async () => {
    mockFindUnique.mockResolvedValue(null);

    const slug = await generateUniqueSlug("");
    expect(slug).toMatch(/^user-[a-z0-9]{4}$/);
  });

  it("retries on collision", async () => {
    mockFindUnique
      .mockResolvedValueOnce({ id: "existing" } as never) // First attempt: collision
      .mockResolvedValueOnce(null); // Second attempt: no collision

    const slug = await generateUniqueSlug("Alice");
    expect(slug).toMatch(/^alice-[a-z0-9]{4}$/);
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
  });

  it("uses longer suffix after 5 collisions", async () => {
    mockFindUnique
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce({ id: "existing" } as never);

    const slug = await generateUniqueSlug("Alice");
    // After 5 collisions, uses double suffix (8 random chars)
    expect(slug).toMatch(/^alice-[a-z0-9]{8}$/);
    expect(mockFindUnique).toHaveBeenCalledTimes(5);
  });
});
