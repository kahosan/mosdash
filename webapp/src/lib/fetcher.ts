export async function fetcher<T>(key: string, init?: RequestInit): Promise<T> {
  const res = await fetch(key, init);
  if (!res.ok)
    throw new Error(await res.text());

  return res.headers.get('Content-Type')?.includes('application/json')
    ? res.json()
    : res.text() as T;
}
