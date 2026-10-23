import { LogExecution, MeasureTime } from "./decorators.js";
import { Repository } from "./repository.js";
import type {
  NewVehicle, ParkingEvents, ParkingTime, ParkingSpot, ParkingTicket,
  SpotStatus, Vehicle, VehicleType,
} from "./types.js";
import { JsonStorage, type DatabaseState } from "./storage.js";

const HOURLY_RATES: Record<VehicleType, number> = {
  motorcycle: 5,
  car: 10,
  truck: 20,
};

export class ParkingService {
  private readonly spots: Repository<ParkingSpot>;
  private readonly tickets: Repository<ParkingTicket>;
  private history: ParkingTime[];
  private events: ParkingEvents[];
  private nextTicketId: number;

  private constructor(private readonly storage: JsonStorage, state: DatabaseState) {
    this.spots = new Repository(state.spots);
    this.tickets = new Repository(state.activeTickets);
    this.history = state.history;
    this.events = state.events;
    this.nextTicketId = state.nextTicketId;
  }

  static async create(storage: JsonStorage): Promise<ParkingService> {
    const state = await storage.load();
    if (state.spots.length === 0) {
      state.spots = createDefaultSpots();
      await storage.save(state);
    }
    return new ParkingService(storage, state);
  }

  @LogExecution
  @MeasureTime
  async parkVehicle(input: NewVehicle): Promise<ParkingTicket> {
    const licensePlate = input.licensePlate.trim().toUpperCase();
    if (!licensePlate) throw new Error("Plate number cannot be empty.");
    if (this.tickets.findAll().some((ticket) => ticket.vehicle.licensePlate === licensePlate)) {
      throw new Error(`Vehicle ${licensePlate} is already parked.`);
    }

    const vehicle: Vehicle = { ...input, licensePlate };
    const spot = this.spots.findAll().find((candidate) =>
      candidate.status === "available" && canFit(vehicle.type, candidate.size));
    if (!spot) throw new Error(`No suitable spot is available for a ${vehicle.type}.`);

    const ticket: ParkingTicket = {
      id: this.nextTicketId++,
      vehicle,
      spotId: spot.id,
      entryTime: new Date().toISOString(),
    };
    this.tickets.add(ticket);
    this.spots.update(spot.id, { status: "parked", currentTicketId: ticket.id });
    this.events.push({ type: "vehicle-parked", vehiclePlate: vehicle.licensePlate, parkingLabel: spot.label, at: ticket.entryTime });
    await this.persist();
    return ticket;
  }

  @LogExecution
  @MeasureTime
  async releaseVehicle(plate: string): Promise<ParkingTime> {
    const licensePlate = plate.trim().toUpperCase();
    const ticket = this.tickets.findAll().find((item) => item.vehicle.licensePlate === licensePlate);
    if (!ticket) throw new Error(`No active parking ticket found for ${licensePlate}.`);

    const exitTime = new Date();
    const entryTime = new Date(ticket.entryTime);
    const durationMinutes = Math.max(1, Math.ceil((exitTime.getTime() - entryTime.getTime()) / 60_000));
    const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));
    const cost = billableHours * HOURLY_RATES[ticket.vehicle.type];
    const record: ParkingTime = {
      ...ticket,
      exitTime: exitTime.toISOString(),
      duration: durationMinutes,
      cost,
    };

    this.tickets.delete(ticket.id);
    this.spots.update(ticket.spotId, { status: "available", currentTicketId: undefined });
    this.history.push(record);
    this.events.push({ type: "vehicle-released", vehiclePlate: ticket.vehicle.licensePlate, costMAD: cost, at: record.exitTime });
    await this.persist();
    return record;
  }

  getSpots(): ParkingSpot[] { return this.spots.findAll().sort((a, b) => a.id - b.id); }
  getActiveTickets(): ParkingTicket[] { return this.tickets.findAll(); }
  getHistory(): ParkingTime[] { return [...this.history].reverse(); }
  getEvents(): ParkingEvents[] { return [...this.events].reverse(); }

  findActiveVehicle(plate: string): ParkingTicket | undefined {
    return this.tickets.findAll().find((ticket) => ticket.vehicle.licensePlate === plate.trim().toUpperCase());
  }

  getSpotSummary(): SpotStatus {
    const spots = this.getSpots();
    return {
      available: spots.filter((spot) => spot.status === "available").length,
      parked: spots.filter((spot) => spot.status === "parked").length,
    };
  }

  getStatistics(): { totalSpots: number; available: number; parked: number; activeVehicles: number; totalRevenueMAD: number } {
    const summary = this.getSpotSummary();
    return {
      totalSpots: this.getSpots().length,
      available: summary.available,
      parked: summary.parked,
      activeVehicles: this.tickets.findAll().length,
      totalRevenueMAD: this.history.reduce((sum, record) => sum + record.cost, 0),
    };
  }

  private async persist(): Promise<void> {
    await this.storage.save({
      spots: this.spots.findAll(),
      activeTickets: this.tickets.findAll(),
      history: this.history,
      events: this.events,
      nextTicketId: this.nextTicketId,
    });
  }
}

function canFit(type: VehicleType, size: ParkingSpot["size"]): boolean {
  if (type === "motorcycle") return true;
  if (type === "car") return size === "regular" || size === "large";
  return size === "large";
}

function createDefaultSpots(): ParkingSpot[] {
  return [
    ...Array.from({ length: 3 }, (_, index): ParkingSpot => ({ id: index + 1, label: `S-${index + 1}`, size: "small", status: "available" })),
    ...Array.from({ length: 5 }, (_, index): ParkingSpot => ({ id: index + 4, label: `R-${index + 1}`, size: "regular", status: "available" })),
    ...Array.from({ length: 2 }, (_, index): ParkingSpot => ({ id: index + 9, label: `L-${index + 1}`, size: "large", status: "available" })),
  ];
}
