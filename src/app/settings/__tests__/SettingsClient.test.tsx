// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsClient from "../SettingsClient";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const defaultSettings = {
  name: "Test User",
  email: "test@test.com",
  avatarUrl: null as string | null,
  theme: "SYSTEM" as const,
  calendarDefaultView: "MONTH" as const,
};

describe("SettingsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
  });

  it("renders the page heading", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders back link to dashboard", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders all section headings", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    expect(screen.getByText("Avatar")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  it("displays initial name and email values", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    expect(screen.getByLabelText("Display Name")).toHaveValue("Test User");
    expect(screen.getByLabelText("Email")).toHaveValue("test@test.com");
  });

  it("displays initial theme value", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    expect(screen.getByLabelText("Theme")).toHaveValue("SYSTEM");
  });

  it("displays initial calendar default view value", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    expect(screen.getByLabelText("Default View")).toHaveValue("MONTH");
  });

  it("updates name field on input", async () => {
    const user = userEvent.setup();
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    const input = screen.getByLabelText("Display Name");
    await user.clear(input);
    await user.type(input, "New Name");

    expect(input).toHaveValue("New Name");
  });

  it("updates email field on input", async () => {
    const user = userEvent.setup();
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    const input = screen.getByLabelText("Email");
    await user.clear(input);
    await user.type(input, "new@test.com");

    expect(input).toHaveValue("new@test.com");
  });

  it("changes theme select", async () => {
    const user = userEvent.setup();
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    await user.selectOptions(screen.getByLabelText("Theme"), "DARK");

    expect(screen.getByLabelText("Theme")).toHaveValue("DARK");
  });

  it("changes calendar default view select", async () => {
    const user = userEvent.setup();
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    await user.selectOptions(screen.getByLabelText("Default View"), "WEEK");

    expect(screen.getByLabelText("Default View")).toHaveValue("WEEK");
  });

  it("calls PATCH on save and shows success message", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    await user.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Settings saved")).toBeInTheDocument();
    });
  });

  it("shows error message on save failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Email already taken" }),
      })
    );

    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    await user.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(screen.getByText("Email already taken")).toBeInTheDocument();
    });
  });

  it("shows error message on network failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network")));

    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    await user.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to save settings. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("shows Saving... while save is in progress", async () => {
    const user = userEvent.setup();
    let resolve: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((r) => {
          resolve = r;
        })
      )
    );

    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    await user.click(screen.getByText("Save Settings"));

    expect(screen.getByText("Saving...")).toBeInTheDocument();

    resolve!({ ok: true, json: () => Promise.resolve({}) });

    await waitFor(() => {
      expect(screen.getByText("Save Settings")).toBeInTheDocument();
    });
  });

  it("shows avatar image when avatarUrl is provided", () => {
    render(
      <SettingsClient
        initialSettings={{
          ...defaultSettings,
          avatarUrl: "https://blob.test/avatar.png",
        }}
        userRole="DOMME"
      />
    );

    const img = screen.getByAltText("Avatar");
    expect(img).toHaveAttribute("src", "https://blob.test/avatar.png");
  });

  it("shows initials fallback when no avatarUrl", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows Remove button when avatar exists", () => {
    render(
      <SettingsClient
        initialSettings={{
          ...defaultSettings,
          avatarUrl: "https://blob.test/avatar.png",
        }}
        userRole="DOMME"
      />
    );

    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("does not show Remove button when no avatar", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
  });

  it("removes avatar when Remove is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SettingsClient
        initialSettings={{
          ...defaultSettings,
          avatarUrl: "https://blob.test/avatar.png",
        }}
        userRole="DOMME"
      />
    );

    await user.click(screen.getByText("Remove"));

    expect(screen.queryByAltText("Avatar")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
  });

  it("uploads avatar via /api/upload", async () => {
    const user = userEvent.setup();
    const mockFetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ url: "https://blob.test/new-avatar.png" }),
      });
    vi.stubGlobal("fetch", mockFetch);

    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const input = screen.getByTestId("avatar-file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/upload", {
        method: "POST",
        body: expect.any(FormData),
      });
    });

    await waitFor(() => {
      const img = screen.getByAltText("Avatar");
      expect(img).toHaveAttribute(
        "src",
        "https://blob.test/new-avatar.png"
      );
    });
  });

  it("shows upload error message on failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ error: "File size exceeds 10MB limit" }),
      })
    );

    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const input = screen.getByTestId("avatar-file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(
        screen.getByText("File size exceeds 10MB limit")
      ).toBeInTheDocument();
    });
  });

  it("shows link to external calendar sync settings", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    const link = screen.getByRole("link", {
      name: /external calendar sync/i,
    });
    expect(link).toHaveAttribute("href", "/settings/calendar");
  });

  it("includes all theme options", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    const themeSelect = screen.getByLabelText("Theme");
    const options = themeSelect.querySelectorAll("option");
    const values = Array.from(options).map((o) => o.value);

    expect(values).toEqual(["SYSTEM", "LIGHT", "DARK"]);
  });

  it("includes all calendar view options", () => {
    render(<SettingsClient initialSettings={defaultSettings} userRole="DOMME" />);

    const viewSelect = screen.getByLabelText("Default View");
    const options = viewSelect.querySelectorAll("option");
    const values = Array.from(options).map((o) => o.value);

    expect(values).toEqual(["MONTH", "WEEK", "DAY"]);
  });
});
