import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import type { Database } from "./types";

const file = path.join(config.dataDir, "db.json");

function empty(): Database {
  return { users: [], activity: [], requests: [], links: [], splits: [], groups: [] };
}

function load(): Database {
  if (!fs.existsSync(file)) return empty();
  return { ...empty(), ...JSON.parse(fs.readFileSync(file, "utf8")) };
}

export function read<T>(fn: (db: Database) => T): T {
  return fn(load());
}

export function write<T>(fn: (db: Database) => T): T {
  const db = load();
  const result = fn(db);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
  return result;
}
