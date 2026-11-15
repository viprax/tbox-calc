import { describe, expect, it } from "vitest";
import { dbScale } from "../../core/chartScale";
import { portedLevelAt, portedResponseDb } from "../../core/portedResponse";
import { CABIN_GAIN_DEFAULT } from "../../core/cabinGain";

describe("automatic dB axis", () => {
    it("retains a useful baseline for a flat response", () => {
        const axis = dbScale([-18, -3, 0]);
        expect(axis.min).toBeLessThanOrEqual(-24);
        expect(axis.max).toBeGreaterThanOrEqual(6);
    });
    it("leaves headroom above peaks and below a deep rolloff", () => {
        const axis = dbScale([-82.5, -30, 16.8]);
        expect(axis.min).toBeLessThan(-82.5);
        expect(axis.max).toBeGreaterThan(16.8);
        expect(axis.ticks.length).toBeLessThanOrEqual(11);
        expect(axis.ticks).toContain(0);
    });
    it("can shrink back when inputs change and handles empty/invalid samples", () => {
        expect(dbScale([-18, 0]).min).toBeGreaterThan(dbScale([-90, 20]).min);
        expect(dbScale([NaN, Infinity])).toEqual(dbScale([]));
    });
});
describe("ported cabin response", () => {
    const p = { fs:32.3, qts:0.28, vas:50.8, vb:190, fb:30, ql:10 };
    it("adds exactly3dB at60Hz with the same cabin model as sealed", () => {
        expect(portedLevelAt(60,p,{...CABIN_GAIN_DEFAULT,enabled:true}) - portedResponseDb(60,p)).toBeCloseTo(3,10);
        expect(portedLevelAt(60,p,CABIN_GAIN_DEFAULT)).toBe(portedResponseDb(60,p));
    });
});
