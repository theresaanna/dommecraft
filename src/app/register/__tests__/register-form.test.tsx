// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "../register-form";

// Mock next-auth/react
const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("RegisterForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("renders role selector with Domme and Sub options", () => {
    render(<RegisterForm />);

    expect(screen.getByText("I am a...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Domme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sub" })).toBeInTheDocument();
  });

  it("defaults to Domme role", () => {
    render(<RegisterForm />);

    // Domme button should have the active styling (bg-zinc-900)
    const dommeButton = screen.getByRole("button", { name: "Domme" });
    expect(dommeButton.className).toContain("bg-zinc-900");
  });

  it("renders create account button", () => {
    render(<RegisterForm />);

    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different456");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    // Should not call fetch when passwords don't match
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls /api/auth/register on submit with matching passwords", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "new-user",
          email: "test@example.com",
          name: "Test User",
        }),
    });
    mockSignIn.mockResolvedValue(undefined);
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          role: "DOMME",
        }),
      });
    });
  });

  it("sends SUB role when Sub is selected", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "new-user",
          email: "test@example.com",
          name: "Test User",
        }),
    });
    mockSignIn.mockResolvedValue(undefined);
    render(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: "Sub" }));
    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          role: "SUB",
        }),
      });
    });
  });

  it("shows error from API response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "An account with this email already exists",
        }),
    });
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("An account with this email already exists")
      ).toBeInTheDocument();
    });
  });

  it("auto-signs in after successful registration", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "new-user",
          email: "test@example.com",
          name: "Test User",
        }),
    });
    mockSignIn.mockResolvedValue(undefined);
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "password123",
        callbackUrl: "/settings",
      });
    });
  });

  it("shows loading state during submission", async () => {
    // Never resolve to keep loading state
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Creating account...")).toBeInTheDocument();
    });
  });

  it("shows generic error on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("An unexpected error occurred")
      ).toBeInTheDocument();
    });
  });

  it("shows invite code field when Sub role is selected", async () => {
    render(<RegisterForm />);

    // Not visible by default (Domme role)
    expect(screen.queryByLabelText("Invite Code")).not.toBeInTheDocument();

    // Click Sub
    await user.click(screen.getByRole("button", { name: "Sub" }));

    expect(screen.getByLabelText("Invite Code")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter code from your Domme")
    ).toBeInTheDocument();
  });

  it("hides invite code field when switching back to Domme", async () => {
    render(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: "Sub" }));
    expect(screen.getByLabelText("Invite Code")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Domme" }));
    expect(screen.queryByLabelText("Invite Code")).not.toBeInTheDocument();
  });

  it("links invite code after SUB registration", async () => {
    // First call: register, second call: link
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "new-user" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "sub-profile-1" }),
      });
    mockSignIn.mockResolvedValue({ error: null });

    // Mock window.location.href
    const locationSpy = vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      href: "",
    } as Location);
    const hrefSetter = vi.fn();
    Object.defineProperty(window.location, "href", {
      set: hrefSetter,
      configurable: true,
    });

    render(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: "Sub" }));
    await user.type(screen.getByLabelText("Email"), "sub@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.type(screen.getByLabelText("Invite Code"), "abc12345");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      // Should sign in with redirect: false
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "sub@example.com",
        password: "password123",
        redirect: false,
      });
    });

    await waitFor(() => {
      // Should call /api/link with invite code
      expect(mockFetch).toHaveBeenCalledWith("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: "abc12345" }),
      });
    });

    locationSpy.mockRestore();
  });

  it("registers SUB without invite code using normal flow", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-user" }),
    });
    mockSignIn.mockResolvedValue(undefined);
    render(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: "Sub" }));
    await user.type(screen.getByLabelText("Email"), "sub@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    // Leave invite code empty
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      // Should use normal signIn with callbackUrl (no invite code to link)
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "sub@example.com",
        password: "password123",
        callbackUrl: "/settings",
      });
    });

    // Should NOT call /api/link
    expect(mockFetch).not.toHaveBeenCalledWith(
      "/api/link",
      expect.anything()
    );
  });
});
