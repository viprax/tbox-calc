import { describe, expect, it } from "vitest";
import { Box3 } from "three";
import { buildSpeakerModel } from "../components/speakerModel";

describe("continuous schematic speaker geometry", () => {
    it.each([{ diameterMm: 381, mountingDepthMm: 245, magnetDiameterMm: 220, magnetDepthMm: 115 }, { diameterMm: 304.8, mountingDepthMm: 137 }])("joins basket to magnet and keeps front parts for %o", (input) => {
        const speaker = buildSpeakerModel(input);
        for (const name of ["frame", "surround", "cone", "dust-cap", "basket", "magnet"]) expect(speaker.getObjectByName(name)).toBeDefined();
        expect(speaker.children.some(p => p.name.includes("spoke"))).toBe(false);
        const basket = new Box3().setFromObject(speaker.getObjectByName("basket")!);
        const magnet = new Box3().setFromObject(speaker.getObjectByName("magnet")!);
        expect(basket.min.z).toBeCloseTo(magnet.max.z, 3);
        expect(magnet.min.z).toBeCloseTo(-input.mountingDepthMm, 3);
        const bounds = new Box3().setFromObject(speaker);
        expect(bounds.max.x - bounds.min.x).toBeCloseTo(input.diameterMm, 2);
    });
    it("has finite geometry with unknown mounting details and rejects invalid diameter", () => {
        const bounds = new Box3().setFromObject(buildSpeakerModel({ diameterMm: 200 }));
        expect([bounds.min.x, bounds.min.y, bounds.min.z, bounds.max.x, bounds.max.y, bounds.max.z].every(Number.isFinite)).toBe(true);
        expect(() => buildSpeakerModel({ diameterMm: NaN })).toThrow();
    });
});
