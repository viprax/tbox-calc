import { DEFAULT_DRIVER, JL_REFERENCE_DRIVER } from "../data/drivers";
import { CABIN_GAIN_DEFAULT, type CabinGain } from "../core/cabinGain";
import type { Dims, MaterialKey } from "../core/boxDimensions";
import type { DriverTS } from "../core/types";

export type SealedMode = "simple" | "expert";
export type SealedView = "chart" | "2d" | "3d" | "drawing";
export type PresetKey = "edge" | "jl";
export const SEALED_DRAFT_KEY = "tbox.sealed-draft.v1";
export const SEALED_PRESETS = { edge: DEFAULT_DRIVER, jl: JL_REFERENCE_DRIVER } as const;

export interface SealedBoxDraft {
    mode: SealedMode;
    view: SealedView;
    presetKey: PresetKey;
    parametersEdited: boolean;
    ts: DriverTS;
    vb: number;
    ql: number;
    cabin: CabinGain;
    material: MaterialKey;
    customDims: boolean;
    dimsMm: Dims;
    limitsEnabled: boolean;
    limitsMm: Dims;
    nominalDiameterInch: number | null;
    frameDiameterMm: number | null;
    cutoutDiameterMm: number | null;
    frontClearanceMm: number;
    driverDepthMm: number;
    rearClearanceMm: number;
    driverDisplacementL: number | null;
    bracesDisplacementL: number;
    displacementSource: "estimate" | "documented";
    magnetDiameterMm: number;
    magnetDepthMm: number;
    driverCenterMm: { x: number; y: number } | null;
}

/** Layout defaults are editable allowances, not manufacturer requirements. */
export function createSealedDraft(): SealedBoxDraft {
    return selectDriverPreset({
        mode: "simple", view: "chart", presetKey: "edge", parametersEdited: false,
        ts: { ...DEFAULT_DRIVER.ts }, vb: 20, ql: 10, cabin: { ...CABIN_GAIN_DEFAULT },
        material: "plywood", customDims: false, dimsMm: { w: 405, h: 405, d: 247 },
        limitsEnabled: false, limitsMm: { w: 900, h: 500, d: 700 },
        nominalDiameterInch: null, frameDiameterMm: null, cutoutDiameterMm: null,
        frontClearanceMm: 30, driverDepthMm: 0, rearClearanceMm: 20,
        driverDisplacementL: null, bracesDisplacementL: 0, displacementSource: "estimate",
        magnetDiameterMm: 0, magnetDepthMm: 0, driverCenterMm: null,
    }, "edge");
}

export function selectDriverPreset(draft: SealedBoxDraft, presetKey: PresetKey): SealedBoxDraft {
    const driver = SEALED_PRESETS[presetKey];
    return {
        ...draft, presetKey, parametersEdited: false, ts: { ...driver.ts },
        nominalDiameterInch: driver.spec.diameterInch ?? null,
        frameDiameterMm: null, driverCenterMm: null,
        cutoutDiameterMm: driver.geometry?.cutoutDiameterMm ?? (driver.spec.cutoutDiameterCm == null ? null : driver.spec.cutoutDiameterCm * 10),
        driverDepthMm: driver.geometry?.mountingDepthMm ?? (driver.spec.mountingDepthCm ?? 0) * 10,
        driverDisplacementL: driver.spec.displacementL ?? null,
        displacementSource: driver.spec.displacementL == null ? "estimate" : "documented",
        magnetDiameterMm: driver.geometry?.magnetDiameterMm ?? 0,
        magnetDepthMm: driver.geometry?.magnetDepthMm ?? 0,
    };
}

/** Invalid numeric edits remain invalid after reload, rather than becoming zero or a default. */
export function encodeSealedDraft(draft: SealedBoxDraft): string {
    return JSON.stringify({ version: 1, draft }, (_key, value: unknown) => typeof value === "number" && !Number.isFinite(value)
        ? { $tboxNumber: Number.isNaN(value) ? "NaN" : String(value) } : value);
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const number = (v: unknown) => typeof v === "number";
const optionalNumber = (v: unknown) => v === null || number(v);
const bool = (v: unknown) => typeof v === "boolean";
const dims = (v: unknown) => record(v) && ["w", "h", "d"].every(k => number(v[k]));
const oneOf = (...options: unknown[]) => (v: unknown) => options.includes(v);
const tsKeys = ["fs", "qts", "vas", "sd", "xmax", "qms", "qes", "re", "le", "bl", "mms"];
const validators: Record<keyof SealedBoxDraft, (v: unknown) => boolean> = {
    mode: oneOf("simple", "expert"), view: oneOf("chart", "2d", "3d", "drawing"),
    presetKey: oneOf("edge", "jl"), parametersEdited: bool,
    ts: v => record(v) && ["fs", "qts", "vas", "sd", "xmax"].every(k => number(v[k])) && Object.keys(v).every(k => tsKeys.includes(k) && number(v[k])),
    vb: number, ql: oneOf(10, Infinity),
    cabin: v => record(v) && bool(v.enabled) && number(v.boostDb) && number(v.centerHz) && number(v.widthOct),
    material: oneOf("plywood", "chipboard"), customDims: bool, dimsMm: dims, limitsEnabled: bool, limitsMm: dims,
    nominalDiameterInch: optionalNumber, frameDiameterMm: optionalNumber, cutoutDiameterMm: optionalNumber,
    frontClearanceMm: number, driverDepthMm: number, rearClearanceMm: number,
    driverDisplacementL: optionalNumber, bracesDisplacementL: number,
    displacementSource: oneOf("estimate", "documented"), magnetDiameterMm: number, magnetDepthMm: number,
    driverCenterMm: v => v === null || record(v) && number(v.x) && number(v.y),
};

export function decodeSealedDraft(raw: string): SealedBoxDraft | null {
    try {
        const stored: unknown = JSON.parse(raw, (_key, v: unknown) => {
            if (record(v) && Object.keys(v).length === 1) {
                if (v.$tboxNumber === "NaN") return NaN;
                if (v.$tboxNumber === "Infinity") return Infinity;
                if (v.$tboxNumber === "-Infinity") return -Infinity;
            }
            return v;
        });
        if (!record(stored) || stored.version !== 1 || !record(stored.draft)) return null;
        const draft = stored.draft;
        if (!Object.entries(validators).every(([key, validate]) => validate(draft[key]))) return null;
        // Whitelist fields; do not retain unrecognised stored properties.
        return Object.fromEntries(Object.keys(validators).map(key => [key, draft[key]])) as unknown as SealedBoxDraft;
    } catch { return null; }
}
