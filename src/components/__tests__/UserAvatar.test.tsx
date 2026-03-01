// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UserAvatar, { getInitials } from "../UserAvatar";

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

describe("getInitials", () => {
  it("returns two initials from a two-word name", () => {
    expect(getInitials("Jane Doe")).toBe("JD");
  });

  it("returns single initial from a single-word name", () => {
    expect(getInitials("Jane")).toBe("J");
  });

  it("returns first and last initial from a three-word name", () => {
    expect(getInitials("Mary Jane Watson")).toBe("MW");
  });

  it("falls back to email initial when no name", () => {
    expect(getInitials(null, "test@test.com")).toBe("T");
  });

  it("returns ? when neither name nor email provided", () => {
    expect(getInitials(null, null)).toBe("?");
  });

  it("returns ? when both are undefined", () => {
    expect(getInitials()).toBe("?");
  });

  it("trims whitespace from name", () => {
    expect(getInitials("  Jane  ")).toBe("J");
  });
});

describe("UserAvatar", () => {
  it("renders avatar image when avatarUrl is provided", () => {
    render(
      <UserAvatar
        name="Jane Doe"
        avatarUrl="https://blob.test/avatar.png"
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://blob.test/avatar.png");
    expect(img).toHaveAttribute("alt", "Jane Doe");
  });

  it("shows initials when no avatarUrl", () => {
    render(<UserAvatar name="Jane Doe" />);

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows email initial when no name or avatarUrl", () => {
    render(<UserAvatar email="test@test.com" />);

    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows ? when neither name nor email provided", () => {
    render(<UserAvatar />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("links to /settings", () => {
    render(<UserAvatar name="Jane" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("has title attribute for accessibility", () => {
    render(<UserAvatar name="Jane" />);

    const link = screen.getByTitle("Settings");
    expect(link).toBeInTheDocument();
  });

  it("uses alt text from name for avatar image", () => {
    render(
      <UserAvatar avatarUrl="https://blob.test/avatar.png" />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "User avatar");
  });
});
