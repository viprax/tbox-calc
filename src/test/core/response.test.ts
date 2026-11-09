import { describe, expect, it } from "vitest";
import { closedBox, responseDb } from "../../core/closedBox.ts";
import { CABIN_GAIN_DEFAULT } from "../../core/cabinGain.ts";
import {
    F_MAX_HZ,
    F_MIN_HZ,
    PEAK_MIN_DB,
    findPeak,
    freqFromX,
    levelAt,
    shiftFreq,
} from "../../core/response.ts";

const ts = { fs: 32.3, qts: 0.28, vas: 50.8, sd: 750, xmax: 20 };
const box20 = closedBox(ts, 20);

describe("levelAt", () => {
    it("без салона совпадает с responseDb", () => {
        expect(levelAt(50, box20.fc, box20.qtc)).toBeCloseTo(responseDb(50, box20.fc, box20.qtc), 10);
    });

    it("с выключенным салоном не меняется", () => {
        const off = { ...CABIN_GAIN_DEFAULT, enabled: false };
        expect(levelAt(40, box20.fc, box20.qtc, off)).toBeCloseTo(levelAt(40, box20.fc, box20.qtc), 10);
    });

    it("с включённым салоном уровень на низах выше", () => {
        const on = { ...CABIN_GAIN_DEFAULT, enabled: true };
        expect(levelAt(40, box20.fc, box20.qtc, on)).toBeGreaterThan(levelAt(40, box20.fc, box20.qtc));
    });
});

describe("findPeak", () => {
    it("без горба (Qtc < 0.707) маркера нет", () => {
        expect(findPeak(60, 0.5)).toBeNull();
    });

    it("при горбе пик выше PEAK_MIN_DB и внутри диапазона", () => {
        const p = findPeak(50, 0.9);
        expect(p).not.toBeNull();
        expect(p!.db).toBeGreaterThanOrEqual(PEAK_MIN_DB);
        expect(p!.f).toBeGreaterThanOrEqual(F_MIN_HZ);
        expect(p!.f).toBeLessThanOrEqual(F_MAX_HZ);
    });

    it("пик совпадает с ручным максимумом по сетке", () => {
        const p = findPeak(50, 0.9)!;
        let manual = -Infinity;
        for (let i = 0; i < 1000; i++) {
            const f = Math.exp(Math.log(F_MIN_HZ) + ((Math.log(F_MAX_HZ) - Math.log(F_MIN_HZ)) * i) / 999);
            manual = Math.max(manual, levelAt(f, 50, 0.9));
        }
        expect(p.db).toBeCloseTo(manual, 10);
    });

    it("точность уровня пика около 0.1 дБ по сравнению с плотной сеткой", () => {
        const p = findPeak(50, 0.9)!;
        let dense = -Infinity;
        for (let i = 0; i < 20000; i++) {
            const f = Math.exp(Math.log(F_MIN_HZ) + ((Math.log(F_MAX_HZ) - Math.log(F_MIN_HZ)) * i) / 19999);
            dense = Math.max(dense, levelAt(f, 50, 0.9));
        }
        expect(Math.abs(p.db - dense)).toBeLessThan(0.1);
    });
});

describe("shiftFreq", () => {
    it("одна стрелка меняет частоту на 1/48 октавы", () => {
        expect(shiftFreq(50, 1)).toBeCloseTo(50 * Math.pow(2, 1 / 48), 10);
    });

    it("не выходит за диапазон", () => {
        expect(shiftFreq(F_MAX_HZ, 100)).toBe(F_MAX_HZ);
        expect(shiftFreq(F_MIN_HZ, -100)).toBe(F_MIN_HZ);
    });
});

describe("freqFromX", () => {
    it("левый край даёт F_MIN, правый F_MAX", () => {
        expect(freqFromX(0, 0, 640)).toBeCloseTo(F_MIN_HZ, 10);
        expect(freqFromX(640, 0, 640)).toBeCloseTo(F_MAX_HZ, 10);
    });
});