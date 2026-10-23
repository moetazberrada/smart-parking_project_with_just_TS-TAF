export enum VehicleType {
    Motorcycle = "motorcycle",
    Car = "car",
    Truck = "truck"
}
export type SpotSize = "small" | "regular" | "large";
export type ParkingStatus = "available" | "parked";

export interface Vehicle {
    type: VehicleType;
    licensePlate: string;
}

export interface ParkingSpot {
    id: number;
    label: string;
    size: SpotSize;
    status: ParkingStatus;
    currentTicketId?: number;
}

export interface ParkingTicket {
    id: number;
    vehicle: Vehicle;
    spotId: number;
    entryTime: string;
}

export interface ParkingTime extends ParkingTicket {
    duration: number;
    exitTime: string;
    cost: number;
}

export type ParkingEvents =
    | {type: "vehicle-parked", vehiclePlate: string, parkingLabel: string, at: string}
    | {type: "vehicle-released", vehiclePlate: string, costMAD: number, at: string};

export type NewVehicle = Pick<Vehicle, "licensePlate" | "type">
export type SpotStatus = Record<ParkingStatus, number>
export type ReleaseEvents = Extract<ParkingEvents, {type: "vehicle-released"}>;

export function isVehicleType(value: string): value is VehicleType {
    return value === "motorcycle" || value ==="car" || value === "truck";
}

export function isVehicle (value: unknown): value is Vehicle{
    if(typeof value !== "object" || value === null)
    {
        return false;
    }
    const candidate = value as Record<string, unknown>;
    return typeof candidate.licensePlate === "string"
        && typeof candidate.type === "string"
        && isVehicleType(candidate.type)
}