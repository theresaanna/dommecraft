// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "../theme-provider";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "next-auth/react";

const mockUseSession = vi.mocked(useSession) as unknown as ReturnType<
  typeof vi.fn
>;

describe("ThemeProvider", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let addEventListener: ReturnType<typeof vi.fn>;
  let removeEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove("dark");

    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    matchMediaMock = vi.fn().mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    });
    Object.defineProperty(window, "matchMedia", {
      value: matchMediaMock,
      writable: true,
    });
  });

  it("adds dark class when theme is DARK", () => {
    mockUseSession.mockReturnValue({
      data: { user: { theme: "DARK" } },
      status: "authenticated",
    });

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when theme is LIGHT", () => {
    document.documentElement.classList.add("dark");

    mockUseSession.mockReturnValue({
      data: { user: { theme: "LIGHT" } },
      status: "authenticated",
    });

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("adds dark class when theme is SYSTEM and OS prefers dark", () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener,
      removeEventListener,
    });

    mockUseSession.mockReturnValue({
      data: { user: { theme: "SYSTEM" } },
      status: "authenticated",
    });

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not add dark class when theme is SYSTEM and OS prefers light", () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    });

    mockUseSession.mockReturnValue({
      data: { user: { theme: "SYSTEM" } },
      status: "authenticated",
    });

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("listens for OS preference changes when theme is SYSTEM", () => {
    mockUseSession.mockReturnValue({
      data: { user: { theme: "SYSTEM" } },
      status: "authenticated",
    });

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  it("does not listen for OS preference changes when theme is DARK", () => {
    mockUseSession.mockReturnValue({
      data: { user: { theme: "DARK" } },
      status: "authenticated",
    });

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(addEventListener).not.toHaveBeenCalled();
  });

  it("defaults to SYSTEM when session has no theme", () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener,
      removeEventListener,
    });

    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("renders children", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    const { getByText } = render(
      <ThemeProvider>
        <div>Child Content</div>
      </ThemeProvider>
    );

    expect(getByText("Child Content")).toBeInTheDocument();
  });
});
