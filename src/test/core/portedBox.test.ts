import { describe, expect, it } from "vitest";
import {
    checkPort,
    effectiveLengthCm,
    lvForTuning,
    portRadiusCm,
    portedBox,
    tuningHz,
} from "../../core/portedBox.ts";
import { SOUND_SPEED_CM_S } from "./constants.ts";

describe("геометрия порта", () => {
    it("радиус по площади: S = πr²", () => {
        expect(portRadiusCm(Math.PI * 4)).toBeCloseTo(2, 10);
    });

    it("эффективная длина больше геометрической", () => {
        expect(effectiveLengthCm(20, 100)).toBeGreaterThan(20);
    });
});

describe("tuningHz", () => {
    it("Fb уменьшается с ростом объёма ящика", () => {
        const geom = { spCm2: 100, lvCm: 30 };
        expect(tuningHz(40, geom)).toBeLessThan(tuningHz(20, geom));
    });

    it("Fb уменьшается с ростом длины трубы", () => {
        expect(tuningHz(30, { spCm2: 100, lvCm: 60 })).toBeLessThan(tuningHz(30, { spCm2: 100, lvCm: 30 }));
    });

    it("Fb растёт с ростом сечения при той же длине", () => {
        expect(tuningHz(30, { spCm2: 200, lvCm: 30 })).toBeGreaterThan(tuningHz(30, { spCm2: 100, lvCm: 30 }));
    });
});

describe("lvForTuning: обратная задача", () => {
    it("длина, найденная по Fb, даёт ту же Fb при прямом расчёте", () => {
        const lv = lvForTuning(30, 100, 40);
        expect(lv).not.toBeNull();
        expect(tuningHz(30, { spCm2: 100, lvCm: lv as number })).toBeCloseTo(40, 6);
    });

    it("возвращает null, если труба не может дать такую настройку", () => {
        // очень маленький ящик и очень высокая Fb: геометрическая длина уходит в минус
        expect(lvForTuning(1, 10, 500)).toBeNull();
    });
});

describe("portedBox: пиковая скорость воздуха", () => {
    it("совпадает с ручным расчётом: Sd 340 см², Xmax 7 мм, Fb 40 Гц, порт 100 см²", () => {
        // Vd = 340 · 0.7 = 238 см³; v = Vd·2πFb / Sp = 238·251.3/100 ≈ 598 см/с = 5.98 м/с
        const r = portedBox(30, { spCm2: 100, lvCm: 52.5 }, 340, 7);
        const expectedMs = (340 * 0.7 * 2 * Math.PI * r.fbHz) / 100 / 100;
        expect(r.peakVelocityMs).toBeCloseTo(expectedMs, 6);
    });

    it("скорость растёт линейно с Xmax", () => {
        const a = portedBox(30, { spCm2: 100, lvCm: 50 }, 340, 5);
        const b = portedBox(30, { spCm2: 100, lvCm: 50 }, 340, 10);
        expect(b.peakVelocityMs).toBeCloseTo(a.peakVelocityMs * 2, 6);
    });

    it("узкий порт даёт большую скорость, чем широкий", () => {
        const narrow = portedBox(30, { spCm2: 50, lvCm: 50 }, 340, 7);
        const wide = portedBox(30, { spCm2: 200, lvCm: 50 }, 340, 7);
        expect(narrow.peakVelocityMs).toBeGreaterThan(wide.peakVelocityMs);
    });

    it("скорость совпадает с ручным расчётом: Sd 750, Xmax 20 мм, Fb 33.1, Sp 500", () => {
        const geom = { spCm2: 500, lvCm: 50 };
        const r = portedBox(190, geom, 750, 20);
        const vd = 750 * (20 / 10);                       // см³
        const expectedCmS = (vd * 2 * Math.PI * r.fbHz) / 500;
        expect(r.peakVelocityMs).toBeCloseTo(expectedCmS / 100, 6);
    });
});

describe("checkPort", () => {
    it("нормальный порт без предупреждений", () => {
        const geom = { spCm2: 200, lvCm: 30 };
        const r = portedBox(30, geom, 340, 7);
        expect(checkPort(r, geom)).toEqual([]);
    });

    it("узкий порт с большим Xmax даёт предупреждение о скорости", () => {
        const geom = { spCm2: 20, lvCm: 30 };
        const r = portedBox(30, geom, 340, 10);
        expect(checkPort(r, geom).some((w) => w.code === "port_velocity_high")).toBe(true);
    });

    it("слишком короткая труба даёт предупреждение о длине", () => {
        const geom = { spCm2: 200, lvCm: 1 };
        const r = portedBox(30, geom, 340, 7);
        expect(checkPort(r, geom).some((w) => w.code === "port_too_short")).toBe(true);
    });
});

describe("константы", () => {
    it("скорость звука в см/с согласована с 343 м/с", () => {
        expect(SOUND_SPEED_CM_S / 100).toBe(343);
    });
});

