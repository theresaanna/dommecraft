import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/blob-helpers", () => ({
  deleteBlob: vi.fn(),
}));

import { GET, PATCH } from "../route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteBlob } from "@/lib/blob-helpers";

const mockAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockDeleteBlob = vi.mocked(deleteBlob);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/user/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/user/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockFindUnique.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns user settings when authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockFindUnique.mockResolvedValue({
      name: "Test User",
      email: "test@test.com",
      avatarUrl: "https://blob.test/avatar.png",
      theme: "SYSTEM",
      calendarDefaultView: "MONTH",
    } as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      name: "Test User",
      email: "test@test.com",
      avatarUrl: "https://blob.test/avatar.png",
      theme: "SYSTEM",
      calendarDefaultView: "MONTH",
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        name: true,
        email: true,
        avatarUrl: true,
        theme: true,
        calendarDefaultView: true,
      },
    });
  });
});

describe("PATCH /api/user/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(createRequest({ name: "New Name" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("updates name only", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockUpdate.mockResolvedValue({
      name: "New Name",
      email: "test@test.com",
      avatarUrl: null,
      theme: "SYSTEM",
      calendarDefaultView: "MONTH",
    } as never);

    const res = await PATCH(createRequest({ name: "New Name" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("New Name");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "New Name" },
      select: {
        name: true,
        email: true,
        avatarUrl: true,
        theme: true,
        calendarDefaultView: true,
      },
    });
  });

  it("updates theme", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockUpdate.mockResolvedValue({
      name: "Test",
      email: "test@test.com",
      avatarUrl: null,
      theme: "DARK",
      calendarDefaultView: "MONTH",
    } as never);

    const res = await PATCH(createRequest({ theme: "DARK" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.theme).toBe("DARK");
  });

  it("updates calendarDefaultView", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockUpdate.mockResolvedValue({
      name: "Test",
      email: "test@test.com",
      avatarUrl: null,
      theme: "SYSTEM",
      calendarDefaultView: "WEEK",
    } as never);

    const res = await PATCH(createRequest({ calendarDefaultView: "WEEK" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.calendarDefaultView).toBe("WEEK");
  });

  it("deletes old blob when avatarUrl changes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockFindUnique.mockResolvedValue({
      avatarUrl: "https://blob.test/old-avatar.png",
    } as never);
    mockUpdate.mockResolvedValue({
      name: "Test",
      email: "test@test.com",
      avatarUrl: "https://blob.test/new-avatar.png",
      theme: "SYSTEM",
      calendarDefaultView: "MONTH",
    } as never);

    const res = await PATCH(
      createRequest({ avatarUrl: "https://blob.test/new-avatar.png" })
    );

    expect(res.status).toBe(200);
    expect(mockDeleteBlob).toHaveBeenCalledWith(
      "https://blob.test/old-avatar.png"
    );
  });

  it("deletes old blob when avatar is removed", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockFindUnique.mockResolvedValue({
      avatarUrl: "https://blob.test/old-avatar.png",
    } as never);
    mockUpdate.mockResolvedValue({
      name: "Test",
      email: "test@test.com",
      avatarUrl: null,
      theme: "SYSTEM",
      calendarDefaultView: "MONTH",
    } as never);

    const res = await PATCH(createRequest({ avatarUrl: null }));

    expect(res.status).toBe(200);
    expect(mockDeleteBlob).toHaveBeenCalledWith(
      "https://blob.test/old-avatar.png"
    );
  });

  it("does not delete blob when avatarUrl is unchanged", async () => {
    const url = "https://blob.test/same-avatar.png";
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockFindUnique.mockResolvedValue({ avatarUrl: url } as never);
    mockUpdate.mockResolvedValue({
      name: "Test",
      email: "test@test.com",
      avatarUrl: url,
      theme: "SYSTEM",
      calendarDefaultView: "MONTH",
    } as never);

    await PATCH(createRequest({ avatarUrl: url }));

    expect(mockDeleteBlob).not.toHaveBeenCalled();
  });

  it("returns 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockUpdate.mockRejectedValue(new Error("Database error"));

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const res = await PATCH(createRequest({ name: "Fail" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");

    consoleSpy.mockRestore();
  });
});
