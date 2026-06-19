// All API calls go through Next.js rewrites (next.config.mjs → /api/* → backend).
// This makes every request same-origin, which fixes cross-origin cookie issues.
// To point to a different backend: set NEXT_PUBLIC_API_URL in .env.local

export async function getJson<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`/api${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function patchJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`/api${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function deleteJson(path: string): Promise<void> {
  const response = await fetch(`/api${path}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
}
