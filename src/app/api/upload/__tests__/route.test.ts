import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

import { POST } from "@/app/api/upload/route";
import { auth } from "@/auth";
import { put } from "@vercel/blob";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockPut = vi.mocked(put);

function createFormDataRequest(
  file?: File | null,
  folder?: string
): Request {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  if (folder) {
    formData.append("folder", folder);
  }
  return new Request("http://localhost:3000/api/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createFormDataRequest(new File(["test"], "test.txt"))
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when no file provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createFormDataRequest());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("No file provided");
  });

  it("returns 400 when file exceeds size limit", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    // Create a file > 10MB
    const largeContent = new Uint8Array(11 * 1024 * 1024);
    const file = new File([largeContent], "large.bin");

    const res = await POST(createFormDataRequest(file));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("File size exceeds 10MB limit");
  });

  it("returns 201 with URL on successful upload", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockPut.mockResolvedValue({
      url: "https://blob.vercel-storage.com/uploads/user-1/photo.jpg",
      pathname: "uploads/user-1/photo.jpg",
      downloadUrl: "https://blob.vercel-storage.com/uploads/user-1/photo.jpg",
      contentType: "image/jpeg",
      contentDisposition: "inline",
    } as never);

    const file = new File(["image data"], "photo.jpg", {
      type: "image/jpeg",
    });
    const res = await POST(createFormDataRequest(file, "avatars"));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.url).toBe(
      "https://blob.vercel-storage.com/uploads/user-1/photo.jpg"
    );
    expect(mockPut).toHaveBeenCalledWith(
      "avatars/user-1/photo.jpg",
      expect.any(File),
      { access: "public" }
    );
  });

  it("uses 'uploads' as default folder", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockPut.mockResolvedValue({
      url: "https://blob.vercel-storage.com/uploads/user-1/file.txt",
      pathname: "uploads/user-1/file.txt",
      downloadUrl: "https://blob.vercel-storage.com/uploads/user-1/file.txt",
      contentType: "text/plain",
      contentDisposition: "inline",
    } as never);

    const file = new File(["content"], "file.txt");
    await POST(createFormDataRequest(file));

    expect(mockPut).toHaveBeenCalledWith(
      "uploads/user-1/file.txt",
      expect.any(File),
      { access: "public" }
    );
  });
});
