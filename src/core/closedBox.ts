import { assertInRange, assertPositive, InvalidInputError } from "./assert.ts";
import type { ClosedBox, DriverTS } from "./types.ts";


export function f3Of(fc: number, qtc: number): number {
    assertPositive("fc", fc);
    assertPositive("qtc", qtc);
    // Avoid cancellation for large Q and overflow of 1/Q² for small Q.
    if (qtc < 1) {
        const q2 = qtc * qtc;
        const a = 1 - 2 * q2;
        return (fc / qtc) * Math.sqrt((a + Math.hypot(a, 2 * q2)) / 2);
    }
    const a = (1 / qtc) ** 2 - 2;
    return fc * Math.sqrt(2 / (Math.hypot(a, 2) - a));
}

export function peakDbOf(qtc: number): number {
    assertPositive("qtc", qtc);
    if (qtc < Math.SQRT1_2) return 0;
    return Math.max(0, 20 * Math.log10(qtc) - 10 * Math.log10(1 - (0.5 / qtc) ** 2));
}

/** Без дополнительных потерь: идеальная модель закрытого ящика. */
export const QL_DEFAULT = Infinity;

/**
 * Расчёт закрытого ящика.
 * ql — опциональная упрощённая добавочная добротность при fc.
 * 1/Qtc = 1/Qtc0 + 1/Ql; это не полная модель утечек корпуса.
 * По умолчанию Infinity: без неподтверждённой поправки.
 */
export function closedBox(ts: DriverTS, vb: number, ql: number = QL_DEFAULT): ClosedBox {
    assertPositive("fs", ts.fs);
    assertPositive("qts", ts.qts);
    assertPositive("vas", ts.vas);
    assertPositive("vb", vb);
    const invQl = ql === Infinity ? 0 : 1 / assertPositive("ql", ql);

    const alpha = ts.vas / vb;
    const k = Math.sqrt(1 + alpha);
    const fc = ts.fs * k;
    const qtc0 = ts.qts * k;
    const qtc = 1 / (1 / qtc0 + invQl);

    return { alpha, fc, qtc, f3: f3Of(fc, qtc), peakDb: peakDbOf(qtc) };
}

export function responseDb(f: number, fc: number, qtc: number): number {
    assertPositive("f", f);
    assertPositive("fc", fc);
    assertPositive("qtc", qtc);
    const logX = Math.log(f) - Math.log(fc);
    const x = Math.exp(-Math.abs(logX));
    // Evaluate the denominator in log space, including subnormal positive Q.
    const logA = Math.log1p(-x * x);
    const logB = -Math.abs(logX) - Math.log(qtc);
    const scale = Math.max(logA, logB);
    const logDenom = scale + 0.5 * Math.log(Math.exp(2 * (logA - scale)) + Math.exp(2 * (logB - scale)));
    return ((logX < 0 ? 40 * logX : 0) - 20 * logDenom) / Math.LN10;
}

export function vbForQtc(ts: DriverTS, targetQtc: number, ql: number = QL_DEFAULT): number | null {
    assertPositive("qts", ts.qts);
    assertPositive("vas", ts.vas);
    assertPositive("targetQtc", targetQtc);
    const invQl = ql === Infinity ? 0 : 1 / assertPositive("ql", ql);
    const invIdealQ = 1 / targetQtc - invQl;
    if (invIdealQ <= 0) return null;
    const idealQ = 1 / invIdealQ;
    if (idealQ <= ts.qts) return null;
    return ts.vas / ((idealQ / ts.qts) ** 2 - 1);
}

export function sampleResponse(
    fc: number,
    qtc: number,
    fMin = 10,
    fMax = 300,
    points = 200,
): { f: number; db: number }[] {
    assertPositive("fc", fc);
    assertPositive("qtc", qtc);
    assertPositive("fMin", fMin);
    assertPositive("fMax", fMax);
    if (fMax <= fMin) throw new InvalidInputError("fMax: должно быть больше fMin");
    assertInRange("points", points, 2, 100_000);
    if (!Number.isInteger(points)) throw new InvalidInputError("points: ожидалось целое число");
    const out: { f: number; db: number }[] = [];
    const lo = Math.log(fMin);
    const hi = Math.log(fMax);
    for (let i = 0; i < points; i++) {
        const f = Math.exp(lo + ((hi - lo) * i) / (points - 1));
        out.push({ f, db: responseDb(f, fc, qtc) });
    }
    return out;
}
