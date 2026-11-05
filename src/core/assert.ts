
export class InvalidInputError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidInputError";
    }
}

export function assertFinite(name: string, x: unknown): number {
    if (typeof x !== "number" || !Number.isFinite(x)) {
        throw new InvalidInputError(`${name}: ожидалось конечное число, получено ${String(x)}`);
    }
    return x;
}

export function assertPositive(name: string, x: unknown): number {
    assertFinite(name, x);
    if ((x as number) <= 0) {
        throw new InvalidInputError(`${name}: ожидалось число больше нуля, получено ${x}`);
    }
    return x as number;
}

export function assertInRange(name: string, x: unknown, min: number, max: number): number {
    assertFinite(name, x);
    const n = x as number;
    if (n < min || n > max) {
        throw new InvalidInputError(`${name}: ожидалось от ${min} до ${max}, получено ${n}`);
    }
    return n;
}