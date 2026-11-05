import type { ClosedBox, DriverTS, DriverType } from "./types.ts";

export type WarningLevel = "info" | "warn" | "error";

export type WarningCode =
    | "qtc_overdamped"
    | "qtc_peaky"
    | "qtc_very_peaky"
    | "vb_too_small"
    | "vb_too_large"
    | "fc_above_crossover"
    | "xmax_small"
    | "wrong_type_for_box";

export interface BoxWarning {
    code: WarningCode;
    level: WarningLevel;
    message: string;
}

export const QTC_OVERDAMPED_BELOW = 0.5;
export const QTC_OK_MAX = 0.75;
export const QTC_PEAKY_MAX = 0.9;
export const VB_MIN_L = 1;
export const VB_MAX_L = 200;
export const XMAX_SUB_MIN_MM = 5;
export const DEFAULT_CROSSOVER_HZ = 80;

export interface BoxCheckInput {
    ts: DriverTS;
    vb: number;
    box: ClosedBox;
    type?: DriverType;
    crossoverHz?: number;
}

interface Ctx {
    qtc: number;
    vb: number;
    fc: number;
    xmax: number;
    crossoverHz: number;
}

const TEXTS: Record<WarningCode, (c: Ctx) => string> = {
    qtc_overdamped: (c) =>
        `Qtc ${c.qtc.toFixed(2)}: бас сухой и тихий. Ящик, возможно, слишком большой для этого динамика.`,
    qtc_peaky: (c) =>
        `Qtc ${c.qtc.toFixed(2)}: заметный подъём на низах, бас может бубнить. Можно немного уменьшить Vb.`,
    qtc_very_peaky: (c) =>
        `Qtc ${c.qtc.toFixed(2)}: сильный горб, бас неровный и окрашенный. Ящик слишком маленький, увеличь Vb.`,
    vb_too_small: (c) =>
        `Vb ${c.vb} л: очень маленький ящик. Проверь единицы: объём в литрах, а не в см³.`,
    vb_too_large: (c) =>
        `Vb ${c.vb} л: очень большой ящик. Проверь единицы и габариты.`,
    fc_above_crossover: (c) =>
        `fc ${c.fc.toFixed(1)} Гц выше частоты раздела ${c.crossoverHz} Гц: сабвуфер начнёт спадать там, где должен работать. Увеличь Vb.`,
    xmax_small: (c) =>
        `Xmax ${c.xmax} мм мал для сабвуфера: на большой мощности динамик упрётся в ход.`,
    wrong_type_for_box: () =>
        `Закрытый ящик не подходит для твитера: динамик не рассчитан на такой объём.`,
};

export function checkClosedBox(input: BoxCheckInput): BoxWarning[] {
    const { ts, vb, box, type } = input;
    const crossoverHz = input.crossoverHz ?? DEFAULT_CROSSOVER_HZ;
    const ctx: Ctx = { qtc: box.qtc, vb, fc: box.fc, xmax: ts.xmax, crossoverHz };
    const out: BoxWarning[] = [];
    const push = (code: WarningCode, level: WarningLevel) => {
        out.push({ code, level, message: TEXTS[code](ctx) });
    };

    if (type === "tweeter") push("wrong_type_for_box", "error");

    const q = box.qtc;
    if (q < QTC_OVERDAMPED_BELOW) push("qtc_overdamped", "info");
    else if (q > QTC_PEAKY_MAX) push("qtc_very_peaky", "error");
    else if (q > QTC_OK_MAX) push("qtc_peaky", "warn");

    if (vb < VB_MIN_L) push("vb_too_small", "warn");
    else if (vb > VB_MAX_L) push("vb_too_large", "info");

    if (type === "subwoofer") {
        if (box.fc > crossoverHz) push("fc_above_crossover", "warn");
        if (ts.xmax < XMAX_SUB_MIN_MM) push("xmax_small", "info");
    }

    return out;
}
export function hasErrors(warnings: BoxWarning[]): boolean {
    return warnings.some((w) => w.level === "error");
}