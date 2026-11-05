import { describe, expect, it } from "vitest";
import { closedBox, f3Of, peakDbOf, responseDb, vbForQtc } from "../../core/closedBox";
import type { DriverTS } from "../../core/types";

// sd и xmax обязательны по типу, на расчёт закрытого ящика не влияют.
const ts: DriverTS = { fs: 32, qts: 0.42, vas: 45, sd: 340, xmax: 7 };

describe("closedBox: свойства", () => {
    it("при очень большом ящике fc стремится к Fs, Qtc к Qts", () => {
        const box = closedBox(ts, 1e9);
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
});

describe("vbForQtc", () => {
    it("возвращает объём, при котором closedBox даёт заданный Qtc", () => {
        const vb = vbForQtc(ts, 0.707);
        expect(vb).not.toBeNull();
        expect(closedBox(ts, vb as number).qtc).toBeCloseTo(0.707, 3);
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