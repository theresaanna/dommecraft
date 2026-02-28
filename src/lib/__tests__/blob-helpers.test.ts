import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

import { deleteBlob } from "@/lib/blob-helpers";
import { del } from "@vercel/blob";

const mockDel = vi.mocked(del);

describe("deleteBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls del with the correct URL", async () => {
    mockDel.mockResolvedValue(undefined as never);

    await deleteBlob("https://blob.vercel-storage.com/test/file.jpg");

    expect(mockDel).toHaveBeenCalledWith(
      "https://blob.vercel-storage.com/test/file.jpg"
    );
  });

  it("handles errors gracefully without throwing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDel.mockRejectedValue(new Error("Blob not found"));

    await expect(
      deleteBlob("https://blob.vercel-storage.com/missing.jpg")
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to delete blob:",
      "https://blob.vercel-storage.com/missing.jpg",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
