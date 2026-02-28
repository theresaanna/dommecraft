// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "../login-form";

// Mock next-auth/react
const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("LoginForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password fields", () => {
    render(<LoginForm callbackUrl="/dashboard" />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders OAuth buttons for Discord and X", () => {
    render(<LoginForm callbackUrl="/dashboard" />);

    expect(
      screen.getByRole("button", { name: /continue with discord/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with x/i })
    ).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    render(<LoginForm callbackUrl="/dashboard" />);

    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("calls signIn with credentials on form submit", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginForm callbackUrl="/dashboard" />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "password123",
        redirect: false,
      });
    });
  });

  it("shows error message on failed sign in", async () => {
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginForm callbackUrl="/dashboard" />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid email or password.")
      ).toBeInTheDocument();
    });
  });

  it("navigates to callbackUrl on successful sign in", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginForm callbackUrl="/settings" />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/settings");
    });
  });

  it("shows loading state during submission", async () => {
    // Never resolve to keep loading state
    mockSignIn.mockReturnValue(new Promise(() => {}));
    render(<LoginForm callbackUrl="/dashboard" />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Signing in...")).toBeInTheDocument();
    });
  });

  it("calls signIn with discord on Discord button click", async () => {
    render(<LoginForm callbackUrl="/dashboard" />);

    await user.click(
      screen.getByRole("button", { name: /continue with discord/i })
    );

    expect(mockSignIn).toHaveBeenCalledWith("discord", {
      callbackUrl: "/dashboard",
    });
  });

  it("calls signIn with twitter on X button click", async () => {
    render(<LoginForm callbackUrl="/dashboard" />);

    await user.click(
      screen.getByRole("button", { name: /continue with x/i })
    );

    expect(mockSignIn).toHaveBeenCalledWith("twitter", {
      callbackUrl: "/dashboard",
    });
  });
});
