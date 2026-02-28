import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizeCredentials } from "@/lib/auth-utils";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCompare = vi.mocked(bcrypt.compare);

describe("authorizeCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when email is missing", async () => {
    const result = await authorizeCredentials({ password: "secret123" });
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when password is missing", async () => {
    const result = await authorizeCredentials({ email: "test@example.com" });
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when both email and password are missing", async () => {
    const result = await authorizeCredentials({});
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await authorizeCredentials({
      email: "noone@example.com",
      password: "secret123",
    });

    expect(result).toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "noone@example.com" },
    });
  });

  it("returns null when user has no passwordHash (OAuth-only user)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "oauth@example.com",
      passwordHash: null,
      name: "OAuth User",
      image: null,
      role: "DOMME",
      timezone: "UTC",
      avatarUrl: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await authorizeCredentials({
      email: "oauth@example.com",
      password: "secret123",
    });

    expect(result).toBeNull();
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("returns null when password is incorrect", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "$2a$12$hashedpassword",
      name: "Test User",
      image: null,
      role: "DOMME",
      timezone: "UTC",
      avatarUrl: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCompare.mockResolvedValue(false as never);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "wrongpassword",
    });

    expect(result).toBeNull();
    expect(mockCompare).toHaveBeenCalledWith(
      "wrongpassword",
      "$2a$12$hashedpassword"
    );
  });

  it("returns user object on valid credentials", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "$2a$12$hashedpassword",
      name: "Test User",
      image: "https://example.com/avatar.png",
      role: "DOMME",
      timezone: "UTC",
      avatarUrl: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCompare.mockResolvedValue(true as never);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "correctpassword",
    });

    expect(result).not.toBeNull();
    expect(result).toEqual({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });
  });

  it("returns user with correct shape (id, email, name, image only)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-2",
      email: "shape@example.com",
      passwordHash: "$2a$12$hash",
      name: null,
      image: null,
      role: "SUB",
      timezone: "America/New_York",
      avatarUrl: "https://example.com/av.png",
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCompare.mockResolvedValue(true as never);

    const result = await authorizeCredentials({
      email: "shape@example.com",
      password: "password123",
    });

    expect(result).toEqual({
      id: "user-2",
      email: "shape@example.com",
      name: null,
      image: null,
    });

    // Should NOT include extra fields
    expect(result).not.toHaveProperty("role");
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("timezone");
  });
});
