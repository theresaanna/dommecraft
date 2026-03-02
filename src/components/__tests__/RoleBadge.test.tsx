// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RoleBadge from "../RoleBadge";

describe("RoleBadge", () => {
  it("renders 'Domme' for DOMME role", () => {
    render(<RoleBadge role="DOMME" />);

    const badge = screen.getByTestId("role-badge");
    expect(badge).toHaveTextContent("Domme");
  });

  it("renders 'sub' for SUB role", () => {
    render(<RoleBadge role="SUB" />);

    const badge = screen.getByTestId("role-badge");
    expect(badge).toHaveTextContent("sub");
  });

  it("uses purple styling for DOMME role", () => {
    render(<RoleBadge role="DOMME" />);

    const badge = screen.getByTestId("role-badge");
    expect(badge.className).toContain("bg-purple-100");
    expect(badge.className).toContain("text-purple-700");
  });

  it("uses teal styling for SUB role", () => {
    render(<RoleBadge role="SUB" />);

    const badge = screen.getByTestId("role-badge");
    expect(badge.className).toContain("bg-teal-100");
    expect(badge.className).toContain("text-teal-700");
  });
});
