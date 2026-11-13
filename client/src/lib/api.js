// Calls to the backend API (/api/…). Errors carry the server's message, already in the visitor's language.
async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(body?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.field = body?.field;
    throw err;
  }
  return body;
}

export const getJson = (path, signal) => request(path, { signal });

export const postJson = (path, data, signal) => request(path, { method: "POST", body: JSON.stringify(data), signal });
