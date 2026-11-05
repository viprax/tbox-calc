import { assertPositive } from "./assert.ts";
import type { DeriveResult, DeriveWarning, DriverSourceMap, DriverTS, FieldMeta } from "./types.ts";
import { litersToM3, m3ToLiters } from "./units.ts";

export const AIR_DENSITY_KG_M3 = 1.2;
export const SPEED_OF_SOUND_M_S = 343;
export const DEFAULT_TOLERANCE = 0.1;

const CM2_PER_M2 = 10_000;
const G_PER_KG = 1_000;

type TsKey = keyof DriverTS;

const REQUIRED: TsKey[] = ["fs", "qts", "vas", "sd", "xmax"];

const PRIORITY: Record<string, number> = {
    datasheet: 3,
    measured: 3,
    winisd: 2,
    user: 2,
    derived: 1,
};

export interface DeriveInput {
    ts: Partial<DriverTS>;
    sources: DriverSourceMap;
}

function priorityOf(meta: FieldMeta | undefined): number {
    if (!meta) return 2;
    return PRIORITY[meta.source] ?? 2;
}

function isNum(x: unknown): x is number {
    return typeof x === "number" && Number.isFinite(x);
}

function relDiff(a: number, b: number): number {
    return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
}

export function qtsFromQmsQes(qms: number, qes: number): number {
    assertPositive("qes", qes);
    assertPositive("qms", qms);
    return (qms * qes) / (qms + qes);
}

export function vasFromMms(fs: number, mmsG: number, sdCm2: number): number {
    assertPositive("fs", fs);
    assertPositive("mms", mmsG);
    assertPositive("sd", sdCm2);
    const sdM2 = sdCm2 / CM2_PER_M2;
    const mmsKg = mmsG / G_PER_KG;
    const omega = 2 * Math.PI * fs;
    const vasM3 = (AIR_DENSITY_KG_M3 * SPEED_OF_SOUND_M_S ** 2 * sdM2 ** 2) / (omega ** 2 * mmsKg);
    return m3ToLiters(vasM3);
}

export function mmsFromVas(fs: number, vasL: number, sdCm2: number): number {
    assertPositive("fs", fs);
    assertPositive("vas", vasL);
    assertPositive("sd", sdCm2);
    const sdM2 = sdCm2 / CM2_PER_M2;
    const omega = 2 * Math.PI * fs;
    const vasM3 = litersToM3(vasL);
    const mmsKg = (AIR_DENSITY_KG_M3 * SPEED_OF_SOUND_M_S ** 2 * sdM2 ** 2) / (omega ** 2 * vasM3);
    return mmsKg * G_PER_KG;
}

function conflictWarning(
    field: TsKey,
    given: number,
    computed: number,
    inputs: TsKey[],
    sources: DriverSourceMap,
    label: string,
    tolerance: number,
): DeriveWarning {
    const fieldPriority = priorityOf(sources[field]);
    const weaker = inputs.filter((k) => priorityOf(sources[k]) < fieldPriority);
    return {
        field,
        kind: "conflict",
        message:
            `${label}: введено ${given.toPrecision(3)}, по связанным полям получено ${computed.toPrecision(3)}. ` +
            `Расхождение больше ${Math.round(tolerance * 100)} %. Проверь данные или удали слабые поля.`,
        removable: weaker.length > 0 ? weaker : inputs,
    };
}

export function derive(input: DeriveInput, tolerance = DEFAULT_TOLERANCE): DeriveResult {
    const ts: Partial<DriverTS> = {};
    const sources: DriverSourceMap = {};

    for (const key of Object.keys(input.ts) as TsKey[]) {
        const value = input.ts[key];
        if (!isNum(value)) continue;
        if (input.sources[key]?.source === "derived") continue;
        ts[key] = value;
        const meta = input.sources[key];
        if (meta) sources[key] = meta;
    }

    const derived: TsKey[] = [];
    const warnings: DeriveWarning[] = [];

    const put = (key: TsKey, value: number, note: string) => {
        ts[key] = value;
        sources[key] = {source: "derived", note};
        derived.push(key);
    };

    if (isNum(ts.qms) && isNum(ts.qes)) {
        const qtsCalc = qtsFromQmsQes(ts.qms, ts.qes);
        if (!isNum(ts.qts)) {
            put("qts", qtsCalc, "из Qms и Qes, низкая достоверность");
        } else if (relDiff(ts.qts, qtsCalc) > tolerance) {
            warnings.push(conflictWarning("qts", ts.qts, qtsCalc, ["qms", "qes"], sources, "Qts", tolerance));
        }
    }

    if (isNum(ts.fs) && isNum(ts.sd)) {
        if (isNum(ts.mms) && !isNum(ts.vas)) {
            put("vas", vasFromMms(ts.fs, ts.mms, ts.sd), "из Mms, Fs и Sd, низкая достоверность");
        } else if (isNum(ts.vas) && !isNum(ts.mms)) {
            put("mms", mmsFromVas(ts.fs, ts.vas, ts.sd), "из Vas, Fs и Sd, низкая достоверность");
        } else if (isNum(ts.vas) && isNum(ts.mms)) {
            const vasCalc = vasFromMms(ts.fs, ts.mms, ts.sd);
            if (relDiff(ts.vas, vasCalc) > tolerance) {
                warnings.push(conflictWarning("vas", ts.vas, vasCalc, ["mms", "fs", "sd"], sources, "Vas", tolerance));
            }
        }
    }

    const missing = REQUIRED.filter((k) => !isNum(ts[k]));
    return { ts, sources, derived, missing, warnings };
}

export function withoutFields(input: DeriveInput, fields: TsKey[]): DeriveInput {
    const ts: Partial<DriverTS> = { ...input.ts };
    const sources: DriverSourceMap = { ...input.sources };
    for (const f of fields) {
        delete ts[f];
        delete sources[f];
    }
    return { ts, sources };
}