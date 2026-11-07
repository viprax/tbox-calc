import { assertPositive } from "./assert";
import { cmToMm, litersToCm3, mmToCm } from "./units";
import { VOLUME_TOLERANCE } from "../test/core/constants.ts";

/** Размеры в сантиметрах. */
export interface Dims {
    w: number;
    h: number;
    d: number;
}

/** Материал стенок. Толщина берётся отсюда, а не из константы. */
export interface Material {
    label: string;
    thicknessMm: number;
}

/** Таблица материалов. Расширяется строкой, тип ключей выводится автоматически. */
export const MATERIALS = {
    plywood: { label: "фанера", thicknessMm: 18 },
    chipboard: { label: "ДСП", thicknessMm: 16 },
} as const satisfies Record<string, Material>;

export type MaterialKey = keyof typeof MATERIALS;

/** Ограничения ниши (внешние размеры, см). Все опциональны. */
export interface Constraints {
    /** Максимальные внешние размеры ниши, см. */
    maxOuterCm?: Partial<Dims>;
    /** Фиксированные внутренние стороны, см. Пропорции их не меняют. */
    fixedInnerCm?: Partial<Dims>;
    /** Пропорции свободных сторон (w, h, d). По умолчанию куб. */
    ratio?: [number, number, number];
}

export interface BoxDimensionsInput extends Constraints {
    /** Целевой внутренний (нетто) объём, литры. */
    vbNetL: number;
    /** Материал стенок. По умолчанию фанера. */
    material?: MaterialKey;
    /** Глубина установки динамика Dm, см. Вычитается из внутренней глубины. */
    dmCm?: number;
}

export interface BoxDimensionsResult {
    fits: boolean;
    /** Внутренние размеры, см, округлены до 1 мм. */
    innerCm: Dims;
    /** Внешние размеры, см. */
    outerCm: Dims;
    /** Фактический объём нетто по округлённым размерам, литры. */
    volumeL: number;
    /** Фактический минус целевой объём, литры. */
    errorL: number;
    /** Причины, если не влезло или есть заметное отклонение объёма. Пусто, если всё в порядке. */
    reasons: string[];
}

const SIDES = ["w", "h", "d"] as const;

/** Округление до миллиметра (0.1 см). */
export function roundToMm(cm: number): number {
    return Math.round(cmToMm(cm)) / 10;
}

/** Внешние размеры: внутренние плюс две стенки по каждой оси, глубина ещё плюс Dm. */
export function outerFromInner(inner: Dims, wallCm: number, dmCm: number): Dims {
    return {
        w: inner.w + 2 * wallCm,
        h: inner.h + 2 * wallCm,
        d: inner.d + 2 * wallCm + dmCm,
    };
}

/** Объём нетто в литрах для внутренних размеров в см. */
export function volumeLiters(inner: Dims): number {
    return (inner.w * inner.h * inner.d) / 1000;
}

/**
 * Масштаб свободных сторон: (target / (fixed · ∏ratio))^(1/n).
 * Одна формула для любого числа свободных сторон (0, 1, 2 или 3).
 */
export function scaleFor(targetCm3: number, fixedVolumeCm3: number, ratios: number[]): number {
    const n = ratios.length;
    if (n === 0) return 1;
    const prod = ratios.reduce((a, b) => a * b, 1);
    return Math.pow(targetCm3 / (fixedVolumeCm3 * prod), 1 / n);
}

/**
 * Внутренний предел стороны по нише.
 * Общее правило: максимум снаружи минус две стенки, а для глубины ещё минус Dm.
 */
export function innerCapOf(key: keyof Dims, maxOuterCm: number, wallCm: number, dmCm: number): number {
    const dm = key === "d" ? dmCm : 0;
    return maxOuterCm - 2 * wallCm - dm;
}

/**
 * Подбор внутренних размеров под целевой объём нетто.
 * Порядок: фиксированные стороны не меняются, свободные получают масштаб по пропорциям,
 * затем сжимаются ограничениями ниши, затем округляются до 1 мм.
 * Объём после сжатия и округления может отличаться от цели: это показывается в errorL.
 */
export function solveBoxDimensions(input: BoxDimensionsInput): BoxDimensionsResult {
    assertPositive("vbNetL", input.vbNetL);
    const material = MATERIALS[input.material ?? "plywood"];
    const wallCm = mmToCm(material.thicknessMm);
    const dmCm = input.dmCm ?? 0;
    if (!Number.isFinite(dmCm) || dmCm < 0) {
        throw new Error("dmCm: ожидалось число не меньше нуля");
    }

    const targetCm3 = litersToCm3(input.vbNetL);
    const fixed = input.fixedInnerCm ?? {};
    const ratioArr = input.ratio ?? [1, 1, 1];
    const ratioOf: Record<keyof Dims, number> = { w: ratioArr[0], h: ratioArr[1], d: ratioArr[2] };

    const freeSides = SIDES.filter((k) => fixed[k] === undefined);
    const fixedVolume = SIDES.filter((k) => fixed[k] !== undefined).reduce((a, k) => a * (fixed[k] as number), 1);

    const scale = scaleFor(targetCm3, fixedVolume, freeSides.map((k) => ratioOf[k]));

    // Сначала свободные стороны по пропорции, потом ограничения ниши.
    const inner: Dims = { w: 0, h: 0, d: 0 };
    for (const k of SIDES) {
        const raw = fixed[k] ?? scale * ratioOf[k];
        const max = input.maxOuterCm?.[k];
        inner[k] = fixed[k] === undefined && max !== undefined
            ? Math.min(raw, innerCapOf(k, max, wallCm, dmCm))
            : raw;
    }

    const roundedInner: Dims = { w: roundToMm(inner.w), h: roundToMm(inner.h), d: roundToMm(inner.d) };
    const volumeL = volumeLiters(roundedInner);
    const errorL = volumeL - input.vbNetL;
    const outerCm = outerFromInner(roundedInner, wallCm, dmCm);

    const reasons: string[] = [];
    for (const k of SIDES) {
        const max = input.maxOuterCm?.[k];
        if (max !== undefined && outerCm[k] > max + 1e-9) {
            reasons.push(`по стороне ${k.toUpperCase()} не хватает ${cmToMm(outerCm[k] - max).toFixed(0)} мм`);
        }
    }
    const relErr = Math.abs(errorL) / input.vbNetL;
    if (relErr > VOLUME_TOLERANCE) {
        reasons.push(`объём ${volumeL.toFixed(2)} л при цели ${input.vbNetL} л, отклонение ${errorL.toFixed(2)} л`);
    }

    return {
        fits: reasons.length === 0,
        innerCm: roundedInner,
        outerCm,
        volumeL,
        errorL,
        reasons,
    };
}