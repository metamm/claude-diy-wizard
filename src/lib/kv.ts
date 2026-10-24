import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { dataDir } from "@/lib/data-dir";

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(dataDir, `${name}.json`), "utf8")) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson(name: string, data: unknown) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, `${name}.json`), JSON.stringify(data, null, 2), "utf8");
}
