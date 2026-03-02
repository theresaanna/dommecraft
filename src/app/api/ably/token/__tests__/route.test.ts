import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/ably", () => ({
  createTokenRequest: vi.fn(),
}));

import { GET } from "@/app/api/ably/token/route";
import { auth } from "@/auth";
import { createTokenRequest } from "@/lib/ably";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockCreateTokenRequest = vi.mocked(createTokenRequest);

describe("GET /api/ably/token", () => {
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

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns a token request for authenticated users", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const fakeTokenRequest = {
      keyName: "test-key",
      clientId: "user-1",
      nonce: "abc123",
      timestamp: Date.now(),
      mac: "sig",
    };
    mockCreateTokenRequest.mockResolvedValue(fakeTokenRequest as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(fakeTokenRequest);
    expect(mockCreateTokenRequest).toHaveBeenCalledWith("user-1");
  });

  it("returns 500 when token creation fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockCreateTokenRequest.mockRejectedValue(new Error("Ably error"));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create token request");
  });

  it("passes the authenticated user id as clientId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-42" },
      expires: "",
    } as never);
    mockCreateTokenRequest.mockResolvedValue({
      keyName: "k",
      clientId: "user-42",
      nonce: "n",
      mac: "m",
    } as never);

    await GET();

    expect(mockCreateTokenRequest).toHaveBeenCalledWith("user-42");
  });
});
