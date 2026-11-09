import { responseDb } from "./closedBox";
import { cabinGainDb, type CabinGain } from "./cabinGain";

/** Частота, где считаем график, Гц. Совпадает с диапазоном ResponseChart. */
export const F_MIN_HZ = 10;
export const F_MAX_HZ = 300;

/** Точек сетки для поиска пика. 1000 даёт шаг около 0.3 % по частоте. */
export const PEAK_GRID_POINTS = 1000;

/** Шаг стрелок по клавиатуре, доля октавы. 1/48 октавы - мелко, без рывков. */
export const ARROW_STEP_OCT = 1 / 48;

/** Минимальный горб, при котором показываем маркер пика, дБ. */
export const PEAK_MIN_DB = 0.5;

/**
 * Уровень АЧХ в точке f с учётом поправки салона, дБ.
 * Аналитическая функция: курсор может стоять на любой частоте без интерполяции.
 */
export function levelAt(f: number, fc: number, qtc: number, cabin?: CabinGain): number {
    const base = responseDb(f, fc, qtc);
    return cabin ? base + cabinGainDb(f, cabin) : base;
}

export interface Peak {
    f: number;
    db: number;
}

/**
 * Самая высокая точка скорректированной кривой на сетке.
 * Возвращает null, если горб меньше PEAK_MIN_DB (маркер не показываем).
 */
export function findPeak(fc: number, qtc: number, cabin?: CabinGain): Peak | null {
    const lo = Math.log(F_MIN_HZ);
    const hi = Math.log(F_MAX_HZ);
    let best: Peak = { f: F_MIN_HZ, db: -Infinity };
    for (let i = 0; i < PEAK_GRID_POINTS; i++) {
        const f = Math.exp(lo + ((hi - lo) * i) / (PEAK_GRID_POINTS - 1));
        const db = levelAt(f, fc, qtc, cabin);
        if (db > best.db) best = { f, db };
    }
    // Горб считаем относительно полки на высоких частотах (0 дБ по формуле).
    return best.db >= PEAK_MIN_DB ? best : null;
}

/** Сдвиг частоты на n шагов стрелками (логарифмически), с ограничением диапазона. */
export function shiftFreq(f: number, steps: number): number {
    const shifted = f * Math.pow(2, (steps * ARROW_STEP_OCT));
    return Math.min(F_MAX_HZ, Math.max(F_MIN_HZ, shifted));
}

/** Пиксель по оси X -> частота (логарифмическая шкала). */
export function freqFromX(x: number, xMin: number, xMax: number): number {
    const t = (x - xMin) / (xMax - xMin);
    return Math.exp(Math.log(F_MIN_HZ) + t * (Math.log(F_MAX_HZ) - Math.log(F_MIN_HZ)));
}