export function LogExecution(
  _target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
): void {
  const original = descriptor.value as (...args: unknown[]) => unknown;
  descriptor.value = function (...args: unknown[]) {
    console.log(`[CALL] ${String(propertyKey)}`, args);
    const result = original.apply(this, args);
    console.log(`[RETURN] ${String(propertyKey)}`, result);
    return result;
  };
}

/** Legacy TypeScript method decorator: measures elapsed time. */
export function MeasureTime(
  _target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
): void {
  const original = descriptor.value as (...args: unknown[]) => unknown;
  descriptor.value = function (...args: unknown[]) {
    const start = performance.now();
    try {
      return original.apply(this, args);
    } finally {
      console.log(`[TIME] ${String(propertyKey)}: ${(performance.now() - start).toFixed(2)} ms`);
    }
  };
}