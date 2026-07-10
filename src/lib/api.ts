export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Thin JSON fetch wrapper for client components. Throws ApiClientError on non-2xx. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(res.status, (body as { error?: string } | null)?.error ?? res.statusText);
  }
  return body as T;
}
