const ARACHNID_SHIELD_BASE_URL = "https://shield.projectarachnid.ca";

/**
 * Scan a file against Project Arachnid Shield to check for known CSAM
 * or harmful/abusive material. Returns true if the file is safe to store.
 */
export async function scanFile(
  file: File
): Promise<{ safe: boolean }> {
  const username = process.env.ARACHNID_SHIELD_USERNAME;
  const password = process.env.ARACHNID_SHIELD_PASSWORD;

  if (!username || !password) {
    console.warn("Arachnid Shield credentials not configured, skipping scan");
    return { safe: true };
  }

  // Only scan image and video files
  if (
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/")
  ) {
    return { safe: true };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const authHeader =
      "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

    const response = await fetch(`${ARACHNID_SHIELD_BASE_URL}/v1/media/`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": file.type,
        "Content-Length": String(buffer.byteLength),
      },
      body: buffer,
    });

    if (!response.ok) {
      console.error(
        `Arachnid Shield API error: ${response.status} ${response.statusText}`
      );
      // Allow upload on API error to avoid blocking all uploads
      return { safe: true };
    }

    const data = await response.json();
    const classification = data.classification;

    // Reject if classified as CSAM or harmful/abusive material
    if (
      classification === "csam" ||
      classification === "harmful-abusive-material"
    ) {
      return { safe: false };
    }

    return { safe: true };
  } catch (error) {
    console.error("Arachnid Shield scan failed:", error);
    // Allow upload on network/unexpected errors
    return { safe: true };
  }
}
