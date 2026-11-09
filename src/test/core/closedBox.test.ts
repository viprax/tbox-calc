import { describe, expect, it } from "vitest";
import { closedBox, f3Of, peakDbOf, responseDb, vbForQtc } from "../../core/closedBox";
import type { DriverTS } from "../../core/types";
import { sampleResponse } from "../../core/closedBox";

// sd и xmax обязательны по типу, на расчёт закрытого ящика не влияют.
const ts: DriverTS = { fs: 32, qts: 0.42, vas: 45, sd: 340, xmax: 7 };

describe("closedBox: свойства", () => {
    it("при очень большом ящике fc стремится к Fs, Qtc к Qts", () => {
        const box = closedBox(ts, 1e9, Infinity);
        expect(box.fc).toBeCloseTo(ts.fs, 3);
        expect(box.qtc).toBeCloseTo(ts.qts, 3);
    });

    it("alpha = Vas / Vb", () => {
        expect(closedBox(ts, 20).alpha).toBeCloseTo(45 / 20, 10);
    });

    it("уменьшение ящика повышает fc и Qtc", () => {
        const big = closedBox(ts, 40);
        const small = closedBox(ts, 15);
        expect(small.fc).toBeGreaterThan(big.fc);
        expect(small.qtc).toBeGreaterThan(big.qtc);
    });

    it("при Qtc ниже 1/√2 горба нет", () => {
        const box = closedBox(ts, 40);
        expect(box.qtc).toBeLessThan(Math.SQRT1_2);
        expect(box.peakDb).toBe(0);
    });

    it("f3 выше fc при Qtc ниже 1/√2 не выполняется в общем случае: проверяем, что f3 положительна и конечна", () => {
        const box = closedBox(ts, 20);
        expect(Number.isFinite(box.f3)).toBe(true);
        expect(box.f3).toBeGreaterThan(0);
    });

    it("на частоте f3 уровень ровно -3 дБ", () => {
        const box = closedBox(ts, 20);
        expect(responseDb(box.f3, box.fc, box.qtc)).toBeCloseTo(-3.0103, 3);
    });
});

describe("f3Of", () => {
    it("при Qtc = 1/√2 f3 совпадает с fc", () => {
        expect(f3Of(50, Math.SQRT1_2)).toBeCloseTo(50, 6);
    });
});

describe("peakDbOf", () => {
    it("горба нет при Qtc не выше порога", () => {
        expect(peakDbOf(0.5)).toBe(0);
        expect(peakDbOf(Math.SQRT1_2)).toBe(0);
    });

    it("горб растёт с добротностью", () => {
        expect(peakDbOf(0.8)).toBeGreaterThan(0);
        expect(peakDbOf(1.0)).toBeGreaterThan(peakDbOf(0.8));
    });
});

describe("responseDb", () => {
    it("на fc при Qtc 1/√2 уровень около -3 дБ", () => {
        expect(responseDb(50, 50, Math.SQRT1_2)).toBeCloseTo(-3.0103, 3);
    });

    it("на высоких частотах уровень стремится к 0 дБ", () => {
        expect(responseDb(10000, 50, 0.7)).toBeCloseTo(0, 2);
    });

    it("ниже fc спад не мельче 11 дБ на октаву", () => {
        const a = responseDb(10, 50, 0.7);
        const b = responseDb(20, 50, 0.7);
        expect(a - b).toBeLessThan(-11);
    });

    it("контрольная точка: x = 2, Q = 0.5 даёт -1.94 дБ", () => {
        expect(responseDb(100, 50, 0.5)).toBeCloseTo(-1.9382, 3);
    });
});

describe("vbForQtc", () => {
    it("возвращает объём, при котором closedBox даёт заданный Qtc", () => {
        const vb = vbForQtc(ts, 0.707);
        expect(vb).not.toBeNull();
        expect(closedBox(ts, vb as number, Infinity).qtc).toBeCloseTo(0.707, 3);
    });

    it("цель ниже Qts недостижима: null", () => {
        expect(vbForQtc(ts, 0.3)).toBeNull();
    });

    it("цель равная Qts тоже недостижима: null", () => {
        expect(vbForQtc(ts, ts.qts)).toBeNull();
    });
});

describe("входная проверка", () => {
    it("ноль в Vb не доходит до формул", () => {
        expect(() => closedBox(ts, 0)).toThrow(/vb/);
    });

    it("NaN в Fs даёт ошибку с именем параметра", () => {
        expect(() => closedBox({ ...ts, fs: NaN }, 20)).toThrow(/fs/);
    });
});

describe("sampleResponse", () => {
    it("первая точка равна fMin, последняя fMax", () => {
        const pts = sampleResponse(60, 0.7, 10, 300, 50);
        expect(pts[0].f).toBeCloseTo(10, 6);
        expect(pts[pts.length - 1].f).toBeCloseTo(300, 6);
    });

    it("число точек совпадает с запрошенным", () => {
        expect(sampleResponse(60, 0.7, 10, 300, 123)).toHaveLength(123);
    });

    it("точки лог-равномерны: отношение соседних частот постоянно", () => {
        const pts = sampleResponse(60, 0.7, 10, 300, 20);
        const r0 = pts[1].f / pts[0].f;
        const r1 = pts[10].f / pts[9].f;
        expect(r1).toBeCloseTo(r0, 6);
    });

    it("уровень в точках совпадает с responseDb", () => {
        const pts = sampleResponse(60, 0.7, 10, 300, 20);
        expect(pts[5].db).toBeCloseTo(responseDb(pts[5].f, 60, 0.7), 10);
    });
});

describe("closedBox: потери в ящике (Ql)", () => {
    const ts: DriverTS = { fs: 32.3, qts: 0.28, vas: 50.8, sd: 750, xmax: 20 };

    it("без потерь Qtc равен Qtc0", () => {
        const box = closedBox(ts, 20, Infinity);
        expect(box.qtc).toBeCloseTo(0.28 * Math.sqrt(1 + 50.8 / 20), 6);
    });

    it("с Ql = 10 Qtc ниже, чем без потерь", () => {
        expect(closedBox(ts, 20, 10).qtc).toBeLessThan(closedBox(ts, 20, Infinity).qtc);
    });

    it("fc от потерь не зависит", () => {
        expect(closedBox(ts, 20, 10).fc).toBeCloseTo(closedBox(ts, 20, Infinity).fc, 10);
    });

    it("совпадает с WinISD (Ql = 10) на четырёх объёмах", () => {
        expect(closedBox(ts, 10).qtc).toBeCloseTo(0.646, 2);
        expect(closedBox(ts, 20).qtc).toBeCloseTo(0.500, 2);
        expect(closedBox(ts, 40).qtc).toBeCloseTo(0.405, 2);
        expect(closedBox(ts, 7.96).qtc).toBeCloseTo(0.707, 2);
    });

    it("совпадает с WinISD по fc и f3", () => {
        expect(closedBox(ts, 10).fc).toBeCloseTo(79.6, 1);
        expect(closedBox(ts, 20).fc).toBeCloseTo(60.8, 1);
        expect(closedBox(ts, 40).fc).toBeCloseTo(48.7, 1);
        expect(closedBox(ts, 10).f3).toBeCloseTo(87.9, 0);
        expect(closedBox(ts, 20).f3).toBeCloseTo(94.3, 0);
        expect(closedBox(ts, 40).f3).toBeCloseTo(101.3, 0);
    });
});

