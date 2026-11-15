import { describe, expect, it } from "vitest";
import { CABIN_GAIN_DEFAULT, cabinGainDb } from "../../core/cabinGain";

describe("illustrative cabin adjustment", () => {
    it("has a known centre and Gaussian width at exp(-1/2)", () => {
        const cabin = { ...CABIN_GAIN_DEFAULT, enabled: true };
        expect(cabinGainDb(60, cabin)).toBe(3);
        expect(cabinGainDb(120, cabin)).toBeCloseTo(1.8195919791, 8);
    });
    it("ignores inactive settings", () => {
        expect(cabinGainDb(60, { enabled: false, boostDb: NaN, centerHz: 0, widthOct: 0 })).toBe(0);
    });
    it.each([
        { centerHz: 0 }, { widthOct: 0 }, { boostDb: NaN },
    ])("rejects invalid active parameters %o", (bad) => {
        expect(() => cabinGainDb(60, { ...CABIN_GAIN_DEFAULT, enabled: true, ...bad })).toThrow();
    });
    it("rejects nonpositive frequency in the active model", () => {
        expect(() => cabinGainDb(0, { ...CABIN_GAIN_DEFAULT, enabled: true })).toThrow(/f/);
    });
});
