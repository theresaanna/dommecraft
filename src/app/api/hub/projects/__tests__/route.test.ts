import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findMany: vi.fn(), create: vi.fn() },
    category: { findUnique: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET, POST } from "@/app/api/hub/projects/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockProjectFindMany = vi.mocked(prisma.project.findMany);
const mockProjectCreate = vi.mocked(prisma.project.create);
const mockCategoryFindUnique = vi.mocked(prisma.category.findUnique);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/hub/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/hub/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(
      new Request("http://localhost:3000/api/hub/projects")
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);
    const res = await GET(
      new Request("http://localhost:3000/api/hub/projects")
    );
    expect(res.status).toBe(403);
  });

  it("returns projects for authenticated DOMME", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    const mockProjects = [
      { id: "proj-1", name: "Test", color: "#3b82f6" },
    ];
    mockProjectFindMany.mockResolvedValue(mockProjects as never);

    const res = await GET(
      new Request("http://localhost:3000/api/hub/projects")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockProjects);
  });
});

describe("POST /api/hub/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      createRequest({ name: "Test", categoryId: "cat-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    const res = await POST(createRequest({ categoryId: "cat-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when categoryId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    const res = await POST(createRequest({ name: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when category not owned by user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCategoryFindUnique.mockResolvedValue(null);
    const res = await POST(
      createRequest({ name: "Test", categoryId: "cat-1" })
    );
    expect(res.status).toBe(404);
  });

  it("creates project with color when provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCategoryFindUnique.mockResolvedValue({ id: "cat-1" } as never);
    const created = {
      id: "proj-1",
      name: "Test",
      color: "#3b82f6",
      categoryId: "cat-1",
    };
    mockProjectCreate.mockResolvedValue(created as never);

    const res = await POST(
      createRequest({
        name: "Test",
        categoryId: "cat-1",
        color: "#3b82f6",
      })
    );
    expect(res.status).toBe(201);
    expect(mockProjectCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ color: "#3b82f6" }),
    });
  });

  it("creates project with null color when not provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCategoryFindUnique.mockResolvedValue({ id: "cat-1" } as never);
    mockProjectCreate.mockResolvedValue({
      id: "proj-1",
      name: "Test",
      color: null,
    } as never);

    const res = await POST(
      createRequest({ name: "Test", categoryId: "cat-1" })
    );
    expect(res.status).toBe(201);
    expect(mockProjectCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ color: null }),
    });
  });
});
