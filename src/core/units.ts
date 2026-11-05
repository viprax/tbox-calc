
export const CM_PER_M = 100;
export const MM_PER_CM = 10;
export const LITERS_PER_M3 = 1000;
export const CM3_PER_LITER = 1000;

// mm -> cm
export function mmToCm(mm: number): number {
    return mm / MM_PER_CM;
}

// cm -> mm
export function cmToMm(cm: number): number {
    return cm * MM_PER_CM;
}

// cm -> m
export function cmToM(cm: number): number {
    return cm / CM_PER_M;
}

// m -> cm
export function mToCm(m: number): number {
    return m * CM_PER_M;
}

// m3 -> l
export function m3ToLiters(m3: number): number {
    return m3 * LITERS_PER_M3;
}

// l -> m3
export function litersToM3(liters: number): number {
    return liters / LITERS_PER_M3;
}

// l -> cm3
export function litersToCm3(liters: number): number {
    return liters * CM3_PER_LITER;
}

// cm3 -> l
export function cm3ToLiters(cm3: number): number {
    return cm3 / CM3_PER_LITER;
}