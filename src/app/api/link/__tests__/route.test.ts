import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

import { POST } from "@/app/api/link/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { createNotification } from "@/lib/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.subProfile.findUnique);
const mockUpdate = vi.mocked(prisma.subProfile.update);
const mockCreateNotification = vi.mocked(createNotification);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest({ inviteCode: "abc123" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ inviteCode: "abc123" }));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when invite code is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "sub-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await POST(createRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invite code is required");
  });

  it("returns 404 when invite code not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "sub-1", role: "SUB" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(createRequest({ inviteCode: "bad-code" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Invite code not found");
  });

  it("returns 400 when already linked", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "sub-1", role: "SUB" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "profile-1",
      linkedUserId: "already-linked",
      userId: "domme-1",
      fullName: "Test Sub",
    } as never);

    const res = await POST(createRequest({ inviteCode: "used-code" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Already linked");
  });

  it("links account and creates SUB_JOINED notification", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "sub-1", role: "SUB" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "profile-1",
      linkedUserId: null,
      userId: "domme-1",
      fullName: "Test Sub",
    } as never);
    mockUpdate.mockResolvedValue({ id: "profile-1" } as never);
    mockCreateNotification.mockResolvedValue({ id: "notif-1" } as never);

    const res = await POST(createRequest({ inviteCode: "valid-code" }));

    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { linkedUserId: "sub-1", inviteCode: null },
    });

    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: "domme-1",
      type: "SUB_JOINED",
      message: "Test Sub has linked their account",
      linkUrl: "/subs/profile-1",
    });
  });

  it("creates notification targeting the DOMME user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "sub-1", role: "SUB" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "profile-2",
      linkedUserId: null,
      userId: "domme-2",
      fullName: "Another Sub",
    } as never);
    mockUpdate.mockResolvedValue({ id: "profile-2" } as never);
    mockCreateNotification.mockResolvedValue({ id: "notif-2" } as never);

    await POST(createRequest({ inviteCode: "another-code" }));

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "domme-2",
        type: "SUB_JOINED",
      })
    );
  });
});
