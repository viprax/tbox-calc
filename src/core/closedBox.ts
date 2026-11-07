import { assertPositive } from "./assert.ts";
import type { ClosedBox, DriverTS } from "./types.ts";

export function f3Of(fc: number, qtc: number): number {
    assertPositive("fc", fc);
    assertPositive("qtc", qtc);
    const a = 1 / (qtc * qtc) - 2;
    return fc * Math.sqrt((a + Math.sqrt(a * a + 4)) / 2);
}

export function peakDbOf(qtc: number): number {
    assertPositive("qtc", qtc);
    if (qtc < Math.SQRT1_2) return 0;
    return 20 * Math.log10((qtc * qtc) / Math.sqrt(qtc * qtc - 0.25));
}

export function closedBox(ts: DriverTS, vb: number): ClosedBox {
    assertPositive("fs", ts.fs);
    assertPositive("qts", ts.qts);
    assertPositive("vas", ts.vas);
    assertPositive("vb", vb);

    const alpha = ts.vas / vb;
    const k = Math.sqrt(1 + alpha);
    const fc = ts.fs * k;
    const qtc = ts.qts * k;

    return {
        alpha,
        fc,
        qtc,
        f3: f3Of(fc, qtc),
        peakDb: peakDbOf(qtc),
    };
}

export function responseDb(f: number, fc: number, qtc: number): number {
    assertPositive("f", f);
    assertPositive("fc", fc);
    assertPositive("qtc", qtc);
    const x2 = (f / fc) ** 2;
    return 20 * Math.log10(x2 / Math.sqrt((1 - x2) ** 2 + x2 / (qtc * qtc)));
}

export function vbForQtc(ts: DriverTS, targetQtc: number): number | null {
    assertPositive("qts", ts.qts);
    assertPositive("vas", ts.vas);
    assertPositive("targetQtc", targetQtc);
    if (targetQtc <= ts.qts) return null;
    return ts.vas / ((targetQtc / ts.qts) ** 2 - 1);
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
    const out: { f: number; db: number }[] = [];
    const lo = Math.log(fMin);
    const hi = Math.log(fMax);
    for (let i = 0; i < points; i++) {
        const f = Math.exp(lo + ((hi - lo) * i) / (points - 1));
        out.push({ f, db: responseDb(f, fc, qtc) });
    }
    return out;
}
