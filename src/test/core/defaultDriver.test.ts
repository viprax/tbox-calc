import { describe, expect, it } from "vitest";
import { JL_REFERENCE_DRIVER as DEFAULT_DRIVER, JL_REFERENCE_NET_VOLUME_L as DEFAULT_NET_VOLUME_L } from "../../data/drivers";
import { closedBox } from "../../core/closedBox";
import { derive } from "../../core/derive";
import { solveBoxDimensions } from "../../core/boxDimensions";

// Published JL Audio 12W0v3-4 driver data; ideal results calculated separately in SI.
describe("manufacturer example through the calculator", () => {
    it("has consistent Qts and does not fill unknown Mms with anonymous values", () => {
        const result = derive(DEFAULT_DRIVER);
        expect(result.warnings).toEqual([]);
        expect(result.missing).toEqual([]);
        expect(result.ts.qts).toBeCloseTo(0.670, 3);
        expect(DEFAULT_DRIVER.ts.mms).toBeUndefined();
    });
    it("predicts the independent ideal resonance from the published driver parameters", () => {
        const box = closedBox(DEFAULT_DRIVER.ts, DEFAULT_NET_VOLUME_L);
        expect(box.fc).toBeCloseTo(47.9090080457, 8);
        expect(box.qtc).toBeCloseTo(1.1290550612, 8);
        expect(box.f3).toBeCloseTo(35.9297285956, 8);
    });
    it("reserves real driver displacement in the physical enclosure", () => {
        const box = solveBoxDimensions({ vbNetL: DEFAULT_NET_VOLUME_L, displacementL: DEFAULT_DRIVER.spec.displacementL });
        expect(box.grossVolumeL).toBeCloseTo(40.30, 0);
        expect(box.volumeL).toBeCloseTo(38.94, 0);
        expect(box.fits).toBe(true);
    });
});
