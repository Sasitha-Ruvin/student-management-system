type ApiJsonBody<T> = {
  data?: T;
  error?: string;
};

/**
 * Parses admin API JSON responses safely. Avoids "Unexpected end of JSON input"
 * when the body is empty (aborted fetch, proxy error, or unhandled server crash).
 */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: ApiJsonBody<T> = {};

  if (text.trim()) {
    try {
      json = JSON.parse(text) as ApiJsonBody<T>;
    } catch {
      throw new Error(
        res.ok
          ? "Invalid response from server"
          : `Request failed (${res.status})`,
      );
    }
  } else if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  } else {
    throw new Error("Empty response from server — try again");
  }

  if (!res.ok) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }

  return json.data as T;
}
