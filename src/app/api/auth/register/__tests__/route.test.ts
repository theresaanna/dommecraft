import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCreate = vi.mocked(prisma.user.create);
const mockHash = vi.mocked(bcrypt.hash);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(createRequest({ password: "password123" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(createRequest({ email: "test@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(
      createRequest({ email: "test@example.com", password: "short" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Password must be at least 8 characters");
  });

  it("returns 409 when email already exists", async () => {
    mockFindUnique.mockResolvedValue({
      id: "existing-user",
      email: "taken@example.com",
      passwordHash: "$2a$12$hash",
      name: "Existing",
      image: null,
      role: "DOMME",
      timezone: "UTC",
      avatarUrl: null,
      theme: "SYSTEM",
      calendarDefaultView: "MONTH",
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(
      createRequest({ email: "taken@example.com", password: "password123" })
    );
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("An account with this email already exists");
  });

  it("returns 201 on successful registration", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue("$2a$12$hashed" as never);
    mockCreate.mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      name: "New User",
      role: "DOMME",
      createdAt: new Date(),
    } as never);

    const res = await POST(
      createRequest({
        email: "new@example.com",
        password: "password123",
        name: "New User",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.email).toBe("new@example.com");
    expect(data.name).toBe("New User");
  });

  it("hashes password with bcrypt using 12 salt rounds", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue("$2a$12$hashed" as never);
    mockCreate.mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      name: null,
      role: "DOMME",
      createdAt: new Date(),
    } as never);

    await POST(
      createRequest({ email: "new@example.com", password: "mypassword" })
    );

    expect(mockHash).toHaveBeenCalledWith("mypassword", 12);
  });

  it("defaults to DOMME role when no role provided", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue("$2a$12$hashed" as never);
    mockCreate.mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      name: null,
      role: "DOMME",
      createdAt: new Date(),
    } as never);

    await POST(
      createRequest({ email: "new@example.com", password: "password123" })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "DOMME",
        }),
      })
    );
  });

  it("creates user with SUB role when role is SUB", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue("$2a$12$hashed" as never);
    mockCreate.mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      name: null,
      role: "SUB",
      createdAt: new Date(),
    } as never);

    await POST(
      createRequest({
        email: "new@example.com",
        password: "password123",
        role: "SUB",
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "SUB",
        }),
      })
    );
  });

  it("creates user with DOMME role when role is explicitly DOMME", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue("$2a$12$hashed" as never);
    mockCreate.mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      name: null,
      role: "DOMME",
      createdAt: new Date(),
    } as never);

    await POST(
      createRequest({
        email: "new@example.com",
        password: "password123",
        role: "DOMME",
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "DOMME",
        }),
      })
    );
  });

  it("defaults to DOMME for invalid role value", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue("$2a$12$hashed" as never);
    mockCreate.mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      name: null,
      role: "DOMME",
      createdAt: new Date(),
    } as never);

    await POST(
      createRequest({
        email: "new@example.com",
        password: "password123",
        role: "ADMIN",
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "DOMME",
        }),
      })
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB connection failed"));

    const res = await POST(
      createRequest({ email: "test@example.com", password: "password123" })
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
