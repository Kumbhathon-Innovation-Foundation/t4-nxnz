/**
 * Never let a bad response crash the page: safe JSON parsing with clear errors.
 */
export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Server returned an empty response (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server error (${res.status}) — try refreshing`);
  }
}

export async function getJson<T = unknown>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers, cache: "no-store" });
  return safeJson<T>(res);
}

export async function postJson<T = unknown>(url: string, headers: Record<string, string>, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  return safeJson<T>(res);
}

export async function patchJson<T = unknown>(url: string, headers: Record<string, string>, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  return safeJson<T>(res);
}
