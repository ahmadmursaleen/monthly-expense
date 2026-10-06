/** All HTTP calls to the backend go through this module. */
export async function getHealth(): Promise<{ ok: boolean }> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
