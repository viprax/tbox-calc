import { describe, expect, it } from "vitest";
import { createSealedDraft, encodeSealedDraft, decodeSealedDraft, selectDriverPreset } from "../state/sealedDraft";
import { evaluateSealedDraft } from "../state/evaluateSealedDraft";

 describe("sealed modes share one physical calculation", () => {
    it("starts simple without inventing driver displacement, with explicit layout margins", () => {
        const draft = createSealedDraft();
        expect(draft.mode).toBe("simple");
        expect(draft.driverDisplacementL).toBeNull();
        expect(draft.frontClearanceMm).toBe(30);
        expect(draft.rearClearanceMm).toBe(20);
        const result = evaluateSealedDraft(draft);
        expect(result.calculation?.dimensions.grossVolumeL).toBeCloseTo(40.514175, 7);
        expect(result.netVolumeKnown).toBe(false);
        expect(result.targetMatches).toBe(false);
    });
    it("keeps custom TS, geometry and response exactly equal across both modes", () => {
        const draft = { ...createSealedDraft(), ts: { ...createSealedDraft().ts, fs: 30 }, driverDisplacementL: 4, bracesDisplacementL: 1, customDims: true, dimsMm: { w: 450, h: 420, d: 300 } };
        const simple = evaluateSealedDraft({ ...draft, mode: "simple" });
        const expert = evaluateSealedDraft({ ...draft, mode: "expert" });
        expect(simple).toEqual(expert);
        expect(simple.calculation?.dimensions.volumeL).toBeCloseTo(51.7, 8);
        expect(simple.netVolumeKnown).toBe(true);
    });
    it.each([3, 5])("subtracts %sL without silently changing20L target in the previous tight enclosure", (driverDisplacementL) => {
        const draft = { ...createSealedDraft(), frontClearanceMm: 15, rearClearanceMm: 0, driverDisplacementL };
        const result = evaluateSealedDraft(draft);
        expect(result.calculation?.dimensions.volumeL).toBeCloseTo(31.921875 - driverDisplacementL, 8);
        expect(draft.vb).toBe(20);
    });
    it("reports invalid hidden geometry in simple mode instead of computing stale values", () => {
        const result = evaluateSealedDraft({ ...createSealedDraft(), customDims: true, dimsMm: { w: NaN, h: 420, d: 300 } });
        expect(result.calculation).toBeNull();
        expect(result.errors.dimw).toBeTruthy();
    });
    it("switches presets with documented displacement for JL while preserving target and interface mode", () => {
        const next = selectDriverPreset({ ...createSealedDraft(), mode: "expert", vb: 38.94 }, "jl");
        expect(next.ts.fs).toBe(28.43);
        expect(next.driverDisplacementL).toBe(1.36);
        expect(next.displacementSource).toBe("documented");
        expect(next.mode).toBe("expert");
        expect(next.vb).toBe(38.94);
        expect(selectDriverPreset(next, "edge").driverDisplacementL).toBeNull();
    });
});

describe("versioned local sealed draft", () => {
    it("round-trips edited values, modes, cabin, invalid input and partial centre without null/zero confusion", () => {
        const draft = { ...createSealedDraft(), mode: "expert" as const, view: "drawing" as const, driverDisplacementL: 4, customDims: true, dimsMm: { w: NaN, h: -1, d: 350 }, driverCenterMm: { x: 230, y: NaN }, cabin: { enabled: true, boostDb: 4, centerHz: 55, widthOct: 1.5 } };
        expect(decodeSealedDraft(encodeSealedDraft(draft))).toEqual(draft);
    });
    it.each(["{broken", '{"version":99}', '{"version":1,"draft":{"mode":"expert"}}', '{"version":1,"draft":null}'])("rejects incomplete or unrecognised storage %s", raw => {
        expect(decodeSealedDraft(raw)).toBeNull();
    });
});
