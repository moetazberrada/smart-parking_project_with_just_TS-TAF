import type{
    ParkingSpot,
    ParkingTicket,
    ParkingTime,
    ParkingEvents
} from "./types";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface DatabaseState {
  spots: ParkingSpot[];
  activeTickets: ParkingTicket[];
  history: ParkingTime[];
  events: ParkingEvents[];
  nextTicketId: number;
}

const EMPTY_STATE: DatabaseState = {
  spots: [], activeTickets: [], history: [], events: [], nextTicketId: 1,
};

export class JsonStorage {
  constructor(private readonly filePath: string) {}

  async load(): Promise<DatabaseState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!isDatabaseState(parsed)) throw new Error("The database file has an invalid format.");
      return parsed;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return structuredClone(EMPTY_STATE);
      throw error;
    }
  }

  async save(state: DatabaseState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }

}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isDatabaseState(value: unknown): value is DatabaseState {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return Array.isArray(data.spots)
    && Array.isArray(data.activeTickets)
    && Array.isArray(data.history)
    && Array.isArray(data.events)
    && typeof data.nextTicketId === "number";
}
