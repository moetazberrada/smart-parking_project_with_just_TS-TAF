import {
    isVehicleType,
    VehicleType
} from "./types";
import { ParkingService } from "./parkingService";
import { JsonStorage } from "./storage";
import { createInterface } from "node:readline/promises";
import { 
    stdin as input, 
    stdout as output 
} from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rl = createInterface({ input, output });

function printMenu(): void {
  console.log("\n");
  console.log("     SMART PARKING MANAGEMENT SYSTEM");
  console.log("");
  console.log("1. Show all parking spots");
  console.log("2. Park a vehicle");
  console.log("3. Release a vehicle / calculate cost");
  console.log("4. Show currently parked vehicles");
  console.log("5. Search for a parked vehicle");
  console.log("6. Show parking history");
  console.log("7. Show statistics");
  console.log("0. Exit");
}

async function askVehicleType(): Promise<VehicleType> {
  console.log("\nChoose vehicle type:");
  console.log("1. Motorcycle");
  console.log("2. Car");
  console.log("3. Truck");

  while (true) {
    const value = await rl.question("Your choice (1-3): ");

    switch (value) {
        case "1":
            return VehicleType.Motorcycle;
        case "2":
            return VehicleType.Car;
        case "3":
            return VehicleType.Truck;
        default:
               console.log("Invalid choice! Choose 1, 2 or 3.");
    }
    if (isVehicleType(value)) return value;
    console.log("Invalid type. Your choice (1-3).");
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

async function main(): Promise<void> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const service = await ParkingService.create(new JsonStorage(join(currentDir, "../data/parking-db.json")));
  console.log("Welcome! Parking data is saved automatically in data/parking-db.json.");
  let running = true;
  while (running) {
    printMenu();
    const choice = (await rl.question("Choose an option: ")).trim();
    try {
      switch (choice) {
        case "1": {
          const spots = service.getSpots();
          console.table(spots.map(({ id, label, size, status, currentTicketId }) => ({
            id, label, size, status, ticketId: currentTicketId ?? "-",
          })));
          const summary = service.getSpotSummary();
          console.log(`Available: ${summary.available} | Parked: ${summary.parked}`);
          break;
        }
        case "2": {
          const licensePlate = (await rl.question("Plate number: ")).trim().toUpperCase();
          const type = await askVehicleType();
          const ticket = await service.parkVehicle({ licensePlate, type });
          const spot = service.getSpots().find((item) => item.id === ticket.spotId);
          console.log(`Vehicle parked successfully. Spot: ${spot?.label}. Ticket ID: ${ticket.id}.`);
          console.log(`Entry time: ${formatDate(ticket.entryTime)}`);
          break;
        }
        case "3": {
          const plate = await rl.question("Plate number to release: ");
          const record = await service.releaseVehicle(plate);
          console.log("Vehicle released successfully.");
          console.log(`Entry: ${formatDate(record.entryTime)}`);
          console.log(`Exit: ${formatDate(record.exitTime)}`);
          console.log(`Duration: ${record.duration} minute(s)`);
          console.log(`Cost: ${record.cost} MAD`);
          break;
        }
        case "4": {
          const tickets = service.getActiveTickets();
          if (tickets.length === 0) console.log("No vehicles are currently parked.");
          else console.table(tickets.map((ticket) => ({
            ticketId: ticket.id,
            plate: ticket.vehicle.licensePlate,
            type: ticket.vehicle.type,
            spot: service.getSpots().find((spot) => spot.id === ticket.spotId)?.label ?? "?",
            entryTime: formatDate(ticket.entryTime),
          })));
          break;
        }
        case "5": {
          const plate = await rl.question("Plate number to search: ");
          const ticket = service.findActiveVehicle(plate);
          if (!ticket) console.log("Vehicle not found among active parking tickets.");
          else console.log(`Found: ${ticket.vehicle.licensePlate}, ${ticket.vehicle.type}, spot ID ${ticket.spotId}, entered ${formatDate(ticket.entryTime)}.`);
          break;
        }
        case "6": {
          const history = service.getHistory();
          if (history.length === 0) console.log("No completed parking records yet.");
          else console.table(history.map((record) => ({
            plate: record.vehicle.licensePlate,
            type: record.vehicle.type,
            spotId: record.spotId,
            entry: formatDate(record.entryTime),
            exit: formatDate(record.exitTime),
            duration: record.duration,
            costMAD: record.cost,
          })));
          break;
        }
        case "7": {
          const stats = service.getStatistics();
          console.log("Parking statistics");
          console.table([stats]);
          console.log("Hourly rates (MAD): motorcycle = 5, car = 10, truck = 20.");
          console.log("Billing rule: every started hour is charged; minimum charge is one hour.");
          break;
        }
        case "0":
          running = false;
          console.log("Goodbye! Your data has been saved.");
          break;
        default:
          console.log("Invalid option. Choose a number from 0 to 7.");
      }
    } catch (error) {
      console.log(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  rl.close();
}

void main();