import { describe, expect, it } from "vitest";
import { steadyStateHpGain } from "./helpers/steadyState";
import { responseDb } from "../../core/closedBox";

describe("independent time-domain oscillator reference", () => {
    it("keeps phase when measuring the high-pass response at resonance", () => {
        expect(steadyStateHpGain(50, 50, Math.SQRT1_2)).toBeCloseTo(0.7071067812, 3);
        expect(steadyStateHpGain(50, 50, 0.9)).toBeCloseTo(0.9, 3);
    });
    it.each([
        [10, 50, 0.5], [50, 50, 0.7071067812], [100, 50, 0.9],
    ])("agrees with the real calculator at f=%s, fc=%s, Q=%s", (f, fc, q) => {
        expect(20 * Math.log10(steadyStateHpGain(f, fc, q))).toBeCloseTo(responseDb(f, fc, q), 2);
    });
});
