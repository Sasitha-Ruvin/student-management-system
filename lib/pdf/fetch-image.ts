/**
 * Fetches a remote image URL and returns its buffer and MIME type for PDF embedding.
 */
export async function fetchImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/png";
    const mime = contentType.split(";")[0].trim() || "image/png";
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mime };
  } catch {
    return null;
  }
}
