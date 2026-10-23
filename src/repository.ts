import { MeasureTime } from "./decorators";

export class Repository<T extends { id: number }> {
  private items: T[];

  constructor(initialItems: T[] = []) {
    this.items = [...initialItems];
  }

  findAll(): T[] {
    return [...this.items];
  }

  @MeasureTime
  findById(id: number): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  add(item: T): T {
    if (this.items.some((existing) => existing.id === item.id)) {
      throw new Error(`An item with id ${item.id} already exists.`);
    }
    this.items.push(item);
    return item;
  }

  update(id: number, changes: Partial<Omit<T, "id">>): T {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Item with id ${id} was not found.`);
    this.items[index] = { ...this.items[index], ...changes };
    return this.items[index];
  }

  delete(id: number): boolean {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    return this.items.length < before;
  }

  replaceAll(items: T[]): void {
    this.items = [...items];
  }
}
