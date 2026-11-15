import { describe, expect, it } from "vitest";
import { solveBoxDimensions } from "../../core/boxDimensions";
import { boxPanels, dimensionsMm } from "../../core/boxConstruction";
import { driverInstallation } from "../../core/driverInstallation";

 describe("butt-jointed sealed enclosure panels", () => {
    it.each(["plywood", "chipboard"] as const)("reconstructs the cavity and wood volume for %s", (material) => {
        const box = solveBoxDimensions({ vbNetL: 24, material, fixedInnerCm: { w: 30, h: 25, d: 32 } });
        const { panels, thicknessMm: t } = boxPanels(box, material);
        const { w, h, d } = dimensionsMm(box.outerCm);
        expect(panels).toHaveLength(3);
        expect(panels.reduce((n, p) => n + p.quantity, 0)).toBe(6);
        expect(panels[0]).toMatchObject({ widthMm: w, heightMm: h, quantity: 2 });
        expect(panels[1]).toMatchObject({ widthMm: d - 2 * t, heightMm: h, quantity: 2 });
        expect(panels[2]).toMatchObject({ widthMm: w - 2 * t, heightMm: d - 2 * t, quantity: 2 });
        const woodVolume = panels.reduce((v, p) => v + p.quantity * p.widthMm * p.heightMm * t, 0);
        expect(w * h * d - woodVolume).toBeCloseTo(box.grossVolumeL * 1e6, 6);
    });
    it("rejects inconsistent outside dimensions instead of issuing wrong panel sizes", () => {
        const box = solveBoxDimensions({ vbNetL: 20 });
        expect(() => boxPanels({ ...box, outerCm: { ...box.outerCm, w: 1 } }, "plywood")).toThrow();
    });
});

describe("shared installation envelope", () => {
    const outer = { w: 450, h: 450, d: 300 };
    it("keeps nominal diameter as an estimate and does not invent a drilling centre", () => {
        const layout = driverInstallation(outer, 18, { nominalDiameterInch: 15, cutoutDiameterMm: 375, mountingDepthMm: 245 });
        expect(layout.frameDiameterMm).toBe(381);
        expect(layout.frameEstimated).toBe(true);
        expect(layout.centerSpecified).toBe(false);
        expect(layout.rearGapMm).toBe(37);
        expect(layout.missing.length).toBeGreaterThan(0);
    });
    it("checks the requested centre, frame, cutout behind the side walls, and rear gap", () => {
        const layout = driverInstallation(outer, 18, { frameDiameterMm: 400, cutoutDiameterMm: 375, mountingDepthMm: 275, rearClearanceMm: 10, centerMm: { x: 200, y: 225 } });
        expect(layout.frameFits).toBe(true);
        expect(layout.cutoutFits).toBe(false); // 200 - 375/2 < 18mm side wall
        expect(layout.rearGapMm).toBe(7);
        expect(layout.problems.length).toBeGreaterThanOrEqual(2);
    });
    it("accepts a complete fitting installation without guessed measurements", () => {
        const layout = driverInstallation(outer, 18, { frameDiameterMm: 400, cutoutDiameterMm: 375, mountingDepthMm: 245, rearClearanceMm: 10, centerMm: { x: 225, y: 225 } });
        expect(layout.problems).toEqual([]);
        expect(layout.missing).toEqual([]);
        expect(layout.frameEstimated).toBe(false);
    });
    it("treats zero mounting information as unknown and rejects non-finite geometry", () => {
        const layout = driverInstallation(outer, 18, { frameDiameterMm: 0, cutoutDiameterMm: 0, mountingDepthMm: 0 });
        expect(layout.frameDiameterMm).toBeNull();
        expect(layout.cutoutFits).toBeNull();
        expect(layout.rearGapMm).toBeNull();
        expect(() => driverInstallation({ ...outer, w: NaN }, 18, {})).toThrow();
    });
});
