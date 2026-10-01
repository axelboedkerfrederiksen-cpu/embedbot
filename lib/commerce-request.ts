export async function commerceRequest(path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal } : { signal, cache: "no-store" });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "Ændringen kunne ikke gennemføres.");
  return value;
}
