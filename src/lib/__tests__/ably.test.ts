import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateTokenRequest = vi.fn();

vi.mock("ably", () => ({
  default: {
    Rest: vi.fn().mockImplementation(() => ({
      auth: {
        createTokenRequest: mockCreateTokenRequest,
      },
    })),
  },
}));

// Must import after mocking
import { getAblyRest, createTokenRequest } from "@/lib/ably";

describe("getAblyRest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module-level singleton between tests
    vi.resetModules();
  });

  it("throws when ABLY_API_KEY is not set", async () => {
    delete process.env.ABLY_API_KEY;

    // Re-import to get a fresh module with no cached instance
    const { getAblyRest: freshGetAblyRest } = await import("@/lib/ably");

    expect(() => freshGetAblyRest()).toThrow(
      "ABLY_API_KEY environment variable is not set"
    );
  });

  it("creates an Ably REST client when API key is set", async () => {
    process.env.ABLY_API_KEY = "test-key:test-secret";

    const { getAblyRest: freshGetAblyRest } = await import("@/lib/ably");
    const client = freshGetAblyRest();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("returns the same instance on subsequent calls", () => {
    process.env.ABLY_API_KEY = "test-key:test-secret";

    const client1 = getAblyRest();
    const client2 = getAblyRest();

    expect(client1).toBe(client2);
  });
});

describe("createTokenRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABLY_API_KEY = "test-key:test-secret";
  });

  it("calls auth.createTokenRequest with the clientId", async () => {
    const fakeTokenRequest = {
      keyName: "test-key",
      clientId: "user-1",
      nonce: "abc123",
      mac: "sig",
    };
    mockCreateTokenRequest.mockResolvedValue(fakeTokenRequest);

    const result = await createTokenRequest("user-1");

    expect(mockCreateTokenRequest).toHaveBeenCalledWith({
      clientId: "user-1",
    });
    expect(result).toEqual(fakeTokenRequest);
  });

  it("propagates errors from Ably", async () => {
    mockCreateTokenRequest.mockRejectedValue(new Error("Ably error"));

    await expect(createTokenRequest("user-1")).rejects.toThrow("Ably error");
  });
});
