import { describe, expect, it } from "vitest";
import {
    MATERIALS,
    innerCapOf,
    outerFromInner,
    roundToMm,
    scaleFor,
    solveBoxDimensions,
    volumeLiters,
} from "../../core/boxDimensions";

describe("roundToMm", () => {
    it("округляет до 0.1 см (1 мм)", () => {
        expect(roundToMm(16.14)).toBe(16.1);
        expect(roundToMm(16.16)).toBe(16.2);
    });
});

describe("scaleFor", () => {
    it("куб: масштаб равен кубическому корню из целевого объёма", () => {
        expect(scaleFor(27000, 1, [1, 1, 1])).toBeCloseTo(30, 6);
    });

    it("без свободных сторон масштаб 1", () => {
        expect(scaleFor(1000, 1000, [])).toBe(1);
    });

    it("две свободные стороны: квадратный корень", () => {
        expect(scaleFor(10000, 10, [1, 1])).toBeCloseTo(Math.sqrt(1000), 6);
    });
});

describe("innerCapOf", () => {
    it("ширина и высота: максимум минус две стенки", () => {
        expect(innerCapOf("w", 60, 1.8, 0)).toBeCloseTo(56.4, 6);
    });

    it("глубина дополнительно вычитает Dm", () => {
        expect(innerCapOf("d", 40, 1.8, 5)).toBeCloseTo(31.4, 6);
    });
});

describe("outerFromInner", () => {
    it("внешние размеры: внутренние плюс стенки, глубина ещё плюс Dm", () => {
        const outer = outerFromInner({ w: 30, h: 30, d: 30 }, 1.8, 5);
        expect(outer).toEqual({ w: 33.6, h: 33.6, d: 38.6 });
    });
});

describe("solveBoxDimensions: без ограничений", () => {
    it("куб 30 л по фанере подбирается в пределах допуска", () => {
        const r = solveBoxDimensions({ vbNetL: 30 });
        expect(r.reasons).toEqual([]);
        expect(r.fits).toBe(true);
        expect(Math.abs(r.errorL) / 30).toBeLessThan(0.005);
    });

    it("внутренние размеры округлены до 0.1 см", () => {
        const r = solveBoxDimensions({ vbNetL: 30 });
        for (const k of ["w", "h", "d"] as const) {
            expect(Math.round(r.innerCm[k] * 10) / 10).toBe(r.innerCm[k]);
        }
    });

    it("объём туда и обратно: volumeL соответствует innerCm", () => {
        const r = solveBoxDimensions({ vbNetL: 45 });
        expect(r.volumeL).toBeCloseTo(volumeLiters(r.innerCm), 10);
    });

    it("ДСП и фанера дают разные внешние размеры при одинаковом объёме", () => {
        const ply = solveBoxDimensions({ vbNetL: 30, material: "plywood" });
        const chip = solveBoxDimensions({ vbNetL: 30, material: "chipboard" });
        expect(chip.outerCm.w).toBeLessThan(ply.outerCm.w);
        expect(MATERIALS.chipboard.thicknessMm).toBeLessThan(MATERIALS.plywood.thicknessMm);
    });
});

describe("solveBoxDimensions: пропорции", () => {
    it("пропорции 1 : 1.5 : 1.2 сохраняются в пределах округления", () => {
        const r = solveBoxDimensions({ vbNetL: 30, ratio: [1, 1.5, 1.2] });
        expect(r.innerCm.h / r.innerCm.w).toBeCloseTo(1.5, 1);
        expect(r.innerCm.d / r.innerCm.w).toBeCloseTo(1.2, 1);
    });
});

describe("solveBoxDimensions: фиксированные стороны", () => {
    it("фиксированная сторона не меняется, остальные подстраиваются под объём", () => {
        const r = solveBoxDimensions({ vbNetL: 30, fixedInnerCm: { h: 25 } });
        expect(r.innerCm.h).toBe(25);
        expect(Math.abs(r.errorL) / 30).toBeLessThan(0.005);
    });
});

describe("solveBoxDimensions: ниша", () => {
    it("если влезает, reasons пуст", () => {
        const r = solveBoxDimensions({ vbNetL: 20, maxOuterCm: { w: 60, h: 40, d: 40 } });
        expect(r.reasons).toEqual([]);
        expect(r.fits).toBe(true);
    });

    it("если высота не помещается, fits false и причина по стороне H", () => {
        const r = solveBoxDimensions({
            vbNetL: 30,
            fixedInnerCm: { h: 40 },
            maxOuterCm: { h: 30 },
        });
        expect(r.fits).toBe(false);
        expect(r.reasons.some((x) => x.includes("H"))).toBe(true);
    });

    it("внешние размеры не превышают нишу, когда свободные стороны сжаты", () => {
        const r = solveBoxDimensions({ vbNetL: 60, maxOuterCm: { w: 40, h: 40, d: 40 } });
        expect(r.outerCm.w).toBeLessThanOrEqual(40 + 1e-9);
        expect(r.outerCm.h).toBeLessThanOrEqual(40 + 1e-9);
        expect(r.outerCm.d).toBeLessThanOrEqual(40 + 1e-9);
    });

    it("сжатие ниши даёт объём меньше цели и явно это пишет", () => {
        const r = solveBoxDimensions({ vbNetL: 60, maxOuterCm: { w: 30, h: 30, d: 30 } });
        expect(r.errorL).toBeLessThan(0);
        expect(r.fits).toBe(false);
        expect(r.reasons.some((x) => x.includes("отклонение"))).toBe(true);
    });

    it("глубина с Dm учитывается при проверке ниши", () => {
        const withoutDm = solveBoxDimensions({ vbNetL: 20, maxOuterCm: { d: 35 } });
        const withDm = solveBoxDimensions({ vbNetL: 20, maxOuterCm: { d: 35 }, dmCm: 8 });
        expect(withDm.innerCm.d).toBeLessThan(withoutDm.innerCm.d);
        expect(withDm.outerCm.d).toBeLessThanOrEqual(35 + 1e-9);
    });
});

describe("входная проверка", () => {
    it("нулевой объём не проходит", () => {
        expect(() => solveBoxDimensions({ vbNetL: 0 })).toThrow(/vbNetL/);
    });

    it("отрицательный Dm не проходит", () => {
        expect(() => solveBoxDimensions({ vbNetL: 30, dmCm: -1 })).toThrow(/dmCm/);
    });
});