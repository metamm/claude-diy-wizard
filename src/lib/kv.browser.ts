const PREFIX = "claude-diy:";

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = window.localStorage.getItem(PREFIX + name);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(name: string, data: unknown) {
  window.localStorage.setItem(PREFIX + name, JSON.stringify(data));
}
