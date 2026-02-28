import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";

describe("proxy", () => {
  function createRequest(
    pathname: string,
    cookies: Record<string, string> = {}
  ) {
    const url = `http://localhost:3000${pathname}`;
    const request = new NextRequest(url);

    // Add cookies to the request
    for (const [name, value] of Object.entries(cookies)) {
      request.cookies.set(name, value);
    }

    return request;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows /login through without session cookie", () => {
    const response = proxy(createRequest("/login"));
    // NextResponse.next() does not set a redirect location
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows /register through without session cookie", () => {
    const response = proxy(createRequest("/register"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows /api/auth paths through without session cookie", () => {
    const response = proxy(createRequest("/api/auth/callback/discord"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects to /login when no session cookie is present", () => {
    const response = proxy(createRequest("/dashboard"));
    const location = response.headers.get("location");

    expect(location).not.toBeNull();
    expect(location).toContain("/login");
  });

  it("includes callbackUrl in redirect", () => {
    const response = proxy(createRequest("/settings"));
    const location = response.headers.get("location");

    expect(location).toContain("callbackUrl=%2Fsettings");
  });

  it("allows through with authjs.session-token cookie", () => {
    const response = proxy(
      createRequest("/dashboard", {
        "authjs.session-token": "some-session-token",
      })
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows through with __Secure-authjs.session-token cookie", () => {
    const response = proxy(
      createRequest("/dashboard", {
        "__Secure-authjs.session-token": "some-session-token",
      })
    );

    expect(response.headers.get("location")).toBeNull();
  });
});
