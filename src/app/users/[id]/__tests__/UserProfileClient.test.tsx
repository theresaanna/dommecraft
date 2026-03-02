// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import UserProfileClient from "@/app/users/[id]/UserProfileClient";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("UserProfileClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Send Friend Request when status is none", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });

    render(
      <UserProfileClient targetUserId="user-2" targetUserName="Bob" />
    );

    await waitFor(() => {
      expect(screen.getByText("Send Friend Request")).toBeInTheDocument();
    });
  });

  it("renders Request Pending when status is pending_sent", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ status: "pending_sent", friendshipId: "f-1" }),
    });

    render(
      <UserProfileClient targetUserId="user-2" targetUserName="Bob" />
    );

    await waitFor(() => {
      expect(screen.getByText("Request Pending")).toBeInTheDocument();
    });

    expect(screen.getByText("Request Pending")).toBeDisabled();
  });

  it("renders Accept and Reject when status is pending_received", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ status: "pending_received", friendshipId: "f-1" }),
    });

    render(
      <UserProfileClient targetUserId="user-2" targetUserName="Bob" />
    );

    await waitFor(() => {
      expect(screen.getByText("Accept Request")).toBeInTheDocument();
    });
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("renders Remove Friend and Message when status is accepted", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ status: "accepted", friendshipId: "f-1" }),
    });

    render(
      <UserProfileClient targetUserId="user-2" targetUserName="Bob" />
    );

    await waitFor(() => {
      expect(screen.getByText("Remove Friend")).toBeInTheDocument();
    });
    expect(screen.getByText("Message Bob")).toBeInTheDocument();
  });

  it("calls the API when Send Friend Request is clicked", async () => {
    const user = userEvent.setup();

    mockFetch
      // Initial status fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "none" }),
      })
      // Send request API call
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "f-1", status: "PENDING" }),
      });

    render(
      <UserProfileClient targetUserId="user-2" targetUserName="Bob" />
    );

    await waitFor(() => {
      expect(screen.getByText("Send Friend Request")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Send Friend Request"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: "user-2" }),
      });
    });

    // Should update to pending state
    await waitFor(() => {
      expect(screen.getByText("Request Pending")).toBeInTheDocument();
    });
  });

  it("calls accept API when Accept Request is clicked", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ status: "pending_received", friendshipId: "f-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "ACCEPTED" }),
      });

    render(
      <UserProfileClient targetUserId="user-2" targetUserName="Bob" />
    );

    await waitFor(() => {
      expect(screen.getByText("Accept Request")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Accept Request"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId: "f-1", action: "accept" }),
      });
    });

    // Should update to accepted state
    await waitFor(() => {
      expect(screen.getByText("Remove Friend")).toBeInTheDocument();
    });
  });

  it("calls delete API when Remove Friend is clicked", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ status: "accepted", friendshipId: "f-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(
      <UserProfileClient targetUserId="user-2" targetUserName="Bob" />
    );

    await waitFor(() => {
      expect(screen.getByText("Remove Friend")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Remove Friend"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/friends/f-1", {
        method: "DELETE",
      });
    });

    // Should update to none state
    await waitFor(() => {
      expect(screen.getByText("Send Friend Request")).toBeInTheDocument();
    });
  });
});
