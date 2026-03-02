// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    galleryPhoto: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import DiscoverPage from "../page";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

describe("DiscoverPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com", role: "DOMME" },
    });
    vi.mocked(prisma.galleryPhoto.findMany).mockResolvedValue([]);
  });

  it("redirects to login when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await DiscoverPage();
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("shows empty state when no photos exist", async () => {
    const page = await DiscoverPage();
    render(page);

    expect(screen.getByText("No photos yet.")).toBeInTheDocument();
  });

  it("renders photos with domme names linking to profiles", async () => {
    vi.mocked(prisma.galleryPhoto.findMany).mockResolvedValue([
      {
        id: "photo-1",
        fileUrl: "https://example.com/photo1.jpg",
        createdAt: new Date("2025-01-15"),
        user: { id: "domme-1", name: "DommeOne", avatarUrl: null, slug: null },
      },
      {
        id: "photo-2",
        fileUrl: "https://example.com/photo2.jpg",
        createdAt: new Date("2025-01-14"),
        user: { id: "domme-2", name: "DommeTwo", avatarUrl: "https://example.com/avatar.jpg", slug: "domme-two" },
      },
    ] as never);

    const page = await DiscoverPage();
    render(page);

    expect(screen.getByText("DommeOne")).toBeInTheDocument();
    expect(screen.getByText("DommeTwo")).toBeInTheDocument();

    // DommeOne has no slug, links to /users/domme-1
    const linkOne = screen.getByText("DommeOne").closest("a");
    expect(linkOne).toHaveAttribute("href", "/users/domme-1");

    // DommeTwo has slug, links to /u/domme-two
    const linkTwo = screen.getByText("DommeTwo").closest("a");
    expect(linkTwo).toHaveAttribute("href", "/u/domme-two");
  });

  it("queries only DOMME user photos ordered by createdAt desc", async () => {
    await DiscoverPage();

    expect(prisma.galleryPhoto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { role: "DOMME" } },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("renders the page title and back link", async () => {
    const page = await DiscoverPage();
    render(page);

    expect(screen.getByText("Discover")).toBeInTheDocument();
    const backLink = screen.getByText(/Dashboard/);
    expect(backLink).toHaveAttribute("href", "/dashboard");
  });
});
