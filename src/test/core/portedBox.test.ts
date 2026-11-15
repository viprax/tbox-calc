import { describe, expect, it } from "vitest";
import { checkPort, effectiveLengthCm, lvForTuning, portRadiusCm, portedBox, tuningHz } from "../../core/portedBox";

// Independent Helmholtz calculation in SI: c=343 m/s, S=pi*.05² m²,
// V=.03 m³, Leff=.20+(0.85+0.61)*.05=.273 m.
describe("round port: Helmholtz references", () => {
    const geom = { spCm2: 78.53981633974483, lvCm: 20 };
    it("uses a baffle termination plus a free inner end by default", () => {
        expect(portRadiusCm(geom.spCm2)).toBeCloseTo(5, 12);
        expect(effectiveLengthCm(20, geom.spCm2)).toBeCloseTo(27.3, 12);
        expect(tuningHz(30, geom)).toBeCloseTo(53.4585582019, 8);
    });
    it("allows both ends to be flanged explicitly", () => {
        expect(tuningHz(30, { ...geom, endCorrectionFactor: 1.7 })).toBeCloseTo(52.3210119306, 8);
    });
    it("inverts tuning with the same termination geometry", () => {
        expect(lvForTuning(30, geom.spCm2, 53.4585582019)).toBeCloseTo(20, 8);
        const length = lvForTuning(30, geom.spCm2, 40, 1.7)!;
        expect(tuningHz(30, { ...geom, lvCm: length, endCorrectionFactor: 1.7 })).toBeCloseTo(40, 10);
    });
    it("returns null when the requested effective length is shorter than the end correction", () => {
        expect(lvForTuning(1, 10, 500)).toBeNull();
    });
    it("decreases Fb with increased volume or length", () => {
        expect(tuningHz(60, geom)).toBeLessThan(tuningHz(30, geom));
        expect(tuningHz(30, { ...geom, lvCm: 40 })).toBeLessThan(tuningHz(30, geom));
    });
    it.each([0, -1, NaN, Infinity])("rejects invalid area %s", (spCm2) => {
        expect(() => tuningHz(30, { ...geom, spCm2 })).toThrow(/spCm2/);
    });
    it("rejects negative end correction", () => {
        expect(() => tuningHz(30, { ...geom, endCorrectionFactor: -1 })).toThrow(/endCorrection/);
    });
});

describe("port air speed requires port volume flow", () => {
    const geom = { spCm2: 100, lvCm: 30 };
    it("does not invent a velocity from the driver's maximum excursion", () => {
        const port = portedBox(30, geom);
        expect(port.peakVelocityMs).toBeNull();
        expect(checkPort(port, geom).map((w) => w.code)).toEqual(["port_velocity_unknown"]);
    });
    it("converts a supplied 200000 cm³/s peak port flow into 20 m/s", () => {
        const port = portedBox(30, geom, 200_000);
        expect(port.peakVelocityMs).toBe(20);
        expect(checkPort(port, geom).map((w) => w.code)).toContain("port_velocity_high");
    });
    it("distinguishes a known zero flow from an unknown flow", () => {
        const port = portedBox(30, geom, 0);
        expect(port.peakVelocityMs).toBe(0);
        expect(checkPort(port, geom)).toEqual([]);
    });
    it("detects too-short tubes independently of unknown velocity", () => {
        const short = { ...geom, lvCm: 1 };
        expect(checkPort(portedBox(30, short), short).map((w) => w.code)).toContain("port_too_short");
    });
    it.each([-1, Infinity, NaN])("rejects invalid port flow %s", (flow) => {
        expect(() => portedBox(30, geom, flow)).toThrow(/portVolumeFlow/);
    });
});

describe("restored explicit SpeakerShop geometry mode", () => {
    it("reproduces the saved 190L and 80L program inputs without changing the physical mode", () => {
        expect(tuningHz(190, { spCm2: Math.PI * 12.5 ** 2, lvCm: 67.5, model: "speakershop" })).toBeCloseTo(30, 2);
        expect(tuningHz(80, { spCm2: Math.PI * 12.5 ** 2, lvCm: 98.57, model: "speakershop" })).toBeCloseTo(40, 2);
    });
});

describe("restored ported UI: numeric overflow", () => {
    it("rejects a volume that overflows centimetres cubed before emitting a zero tuning", () => {
        expect(() => tuningHz(1e308, { spCm2: 491, lvCm: 67.5 })).toThrow();
    });
});
