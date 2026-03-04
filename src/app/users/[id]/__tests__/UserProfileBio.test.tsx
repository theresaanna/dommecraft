// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Test the bio display markup directly since the profile page is a server component.
// We render the same JSX patterns used in page.tsx.

function BioSection({
  bio,
  isOwnProfile,
}: {
  bio: string | null;
  isOwnProfile: boolean;
}) {
  return (
    <div>
      {bio && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              About
            </h2>
            {isOwnProfile && (
              <a
                href="/settings"
                className="text-base text-zinc-500 hover:text-zinc-700"
              >
                Edit bio &rarr;
              </a>
            )}
          </div>
          <div
            className="prose prose-sm prose-zinc mt-2 dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: bio }}
          />
        </section>
      )}

      {!bio && isOwnProfile && (
        <section>
          <a
            href="/settings"
            className="text-base text-zinc-500 hover:text-zinc-700"
          >
            Add a bio &rarr;
          </a>
        </section>
      )}
    </div>
  );
}

describe("UserProfile Bio Section", () => {
  it("renders bio HTML content with prose styling", () => {
    const { container } = render(
      <BioSection bio="<p>Hello, I am a user!</p>" isOwnProfile={false} />
    );

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Hello, I am a user!")).toBeInTheDocument();

    const proseDiv = container.querySelector(".prose");
    expect(proseDiv).toBeInTheDocument();
  });

  it("shows Edit bio link on own profile when bio exists", () => {
    render(
      <BioSection bio="<p>My bio</p>" isOwnProfile={true} />
    );

    const editLink = screen.getByRole("link", { name: /edit bio/i });
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveAttribute("href", "/settings");
  });

  it("does not show Edit bio link on other users profiles", () => {
    render(
      <BioSection bio="<p>Their bio</p>" isOwnProfile={false} />
    );

    expect(screen.queryByRole("link", { name: /edit bio/i })).not.toBeInTheDocument();
  });

  it("does not render About section when bio is null", () => {
    render(<BioSection bio={null} isOwnProfile={false} />);

    expect(screen.queryByText("About")).not.toBeInTheDocument();
  });

  it("shows Add a bio link on own profile when bio is empty", () => {
    render(<BioSection bio={null} isOwnProfile={true} />);

    const addLink = screen.getByRole("link", { name: /add a bio/i });
    expect(addLink).toBeInTheDocument();
    expect(addLink).toHaveAttribute("href", "/settings");
  });

  it("does not show Add a bio link on other users profiles when bio is empty", () => {
    render(<BioSection bio={null} isOwnProfile={false} />);

    expect(screen.queryByRole("link", { name: /add a bio/i })).not.toBeInTheDocument();
  });

  it("renders rich HTML content correctly", () => {
    const richBio = "<h2>About Me</h2><p>I enjoy <strong>coding</strong> and <em>design</em>.</p>";
    render(<BioSection bio={richBio} isOwnProfile={false} />);

    expect(screen.getByText("About Me")).toBeInTheDocument();
    expect(screen.getByText("coding")).toBeInTheDocument();
    expect(screen.getByText("design")).toBeInTheDocument();
  });
});
