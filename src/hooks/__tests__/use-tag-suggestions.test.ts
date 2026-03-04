// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTagSuggestions } from "../use-tag-suggestions";

describe("useTagSuggestions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array initially", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {})) // never resolves
    );

    const { result } = renderHook(() => useTagSuggestions());
    expect(result.current).toEqual([]);
  });

  it("returns tags after successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tags: ["alpha", "beta", "gamma"] }),
      })
    );

    const { result } = renderHook(() => useTagSuggestions());

    await waitFor(() => {
      expect(result.current).toEqual(["alpha", "beta", "gamma"]);
    });
  });

  it("fetches from /api/tags/suggestions", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tags: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useTagSuggestions());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/tags/suggestions");
    });
  });

  it("handles fetch failure gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    const { result } = renderHook(() => useTagSuggestions());

    // Wait a tick to ensure the catch runs
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("handles non-ok response gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    const { result } = renderHook(() => useTagSuggestions());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});
