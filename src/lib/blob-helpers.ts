import { del } from "@vercel/blob";

export async function deleteBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error("Failed to delete blob:", url, error);
  }
}
