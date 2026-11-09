import { describe, expect, it } from "vitest";
import { calculateClosedBox } from "../../core/closedBoxCalculation";
import { closedBox } from "../../core/closedBox";
import type { DriverTS } from "../../core/types";

const ts: DriverTS = {
    fs: 32.3,
    qts: 0.28,
    vas: 50.8,
    sd: 750,
    xmax: 20,
};

describe("calculateClosedBox", () => {
    it("считает АЧХ по нетто-объёму после вычета вытеснения", () => {
        const calculation = calculateClosedBox({
            ts,
            dimensions: { vbNetL: 20, driverDisplacementL: 2 },
        });
        expect(calculation.dimensions.grossVolumeL).toBeCloseTo(22, 1);
        expect(calculation.dimensions.volumeL).toBeCloseTo(20, 1);
        expect(calculation.response).toEqual(closedBox(ts, calculation.dimensions.volumeL));
    });

    it("передаёт фактический объём после ограничения ниши в АЧХ и предупреждения", () => {
        const calculation = calculateClosedBox({
            ts,
            dimensions: {
                vbNetL: 20,
                maxOuterCm: { w: 12, h: 12, d: 12 },
            },
        });
        const actualVolumeL = calculation.dimensions.volumeL;

        expect(actualVolumeL).toBeLessThan(1);
        expect(calculation.response).toEqual(closedBox(ts, actualVolumeL));
        expect(calculation.response.fc).not.toBeCloseTo(closedBox(ts, 20).fc, 3);
        expect(calculation.warnings).toContainEqual(expect.objectContaining({
            code: "vb_too_small",
            message: `Vb ${actualVolumeL} л: очень маленький ящик. Проверь единицы: объём в литрах, а не в см³.`,
        }));
    });
});
