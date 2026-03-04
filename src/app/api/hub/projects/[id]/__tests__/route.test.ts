import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    category: { findUnique: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { PATCH, DELETE } from "@/app/api/hub/projects/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockProjectFindUnique = vi.mocked(prisma.project.findUnique);
const mockProjectUpdate = vi.mocked(prisma.project.update);
const mockProjectDelete = vi.mocked(prisma.project.delete);

const params = Promise.resolve({ id: "proj-1" });

function createPatchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/hub/projects/proj-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/hub/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(createPatchRequest({ name: "New" }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);
    const res = await PATCH(createPatchRequest({ name: "New" }), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockProjectFindUnique.mockResolvedValue(null);
    const res = await PATCH(createPatchRequest({ name: "New" }), { params });
    expect(res.status).toBe(404);
  });

  it("updates project color", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockProjectUpdate.mockResolvedValue({
      id: "proj-1",
      color: "#ef4444",
    } as never);

    const res = await PATCH(createPatchRequest({ color: "#ef4444" }), {
      params,
    });
    expect(res.status).toBe(200);
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: expect.objectContaining({ color: "#ef4444" }),
    });
  });

  it("clears project color when set to empty string", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockProjectUpdate.mockResolvedValue({
      id: "proj-1",
      color: null,
    } as never);

    const res = await PATCH(createPatchRequest({ color: "" }), { params });
    expect(res.status).toBe(200);
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: expect.objectContaining({ color: null }),
    });
  });

  it("does not include color in update when not provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockProjectUpdate.mockResolvedValue({
      id: "proj-1",
      name: "Updated",
    } as never);

    const res = await PATCH(createPatchRequest({ name: "Updated" }), {
      params,
    });
    expect(res.status).toBe(200);
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { name: "Updated" },
    });
  });
});

describe("DELETE /api/hub/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/proj-1", {
        method: "DELETE",
      }),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockProjectFindUnique.mockResolvedValue(null);
    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/proj-1", {
        method: "DELETE",
      }),
      { params }
    );
    expect(res.status).toBe(404);
  });

  it("deletes project successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockProjectDelete.mockResolvedValue({ id: "proj-1" } as never);

    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/proj-1", {
        method: "DELETE",
      }),
      { params }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ success: true });
  });
});
