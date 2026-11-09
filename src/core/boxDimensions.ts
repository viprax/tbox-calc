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
    /** Глубина установки динамика Dm, см. Измеряется от наружной поверхности передней панели. */
    dmCm?: number;
    /** Объём, занимаемый динамиком внутри короба, литры. */
    driverDisplacementL?: number;
    /** Минимальная ширина и высота наружной передней панели, мм (номинальный размер динамика). */
    minFrontOuterMm?: number;
}

export interface BoxDimensionsResult {
    fits: boolean;
    /** Внутренние размеры, см, округлены до 1 мм. */
    innerCm: Dims;
    /** Внешние размеры, см. */
    outerCm: Dims;
    /** Фактический объём нетто по округлённым размерам, литры. */
    volumeL: number;
    /** Геометрический внутренний объём до вычета вытеснения динамика, литры. */
    grossVolumeL: number;
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

/** Внешние размеры: внутренние плюс две стенки по каждой оси, глубина динамика проверяется отдельно. */
export function outerFromInner(inner: Dims, wallCm: number, _dmCm: number): Dims {
    return {
        w: inner.w + 2 * wallCm,
        h: inner.h + 2 * wallCm,
        d: inner.d + 2 * wallCm,
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
 * Общее правило: максимум снаружи минус две стенки, глубина установки не вычитается из объёма.
 */
export function innerCapOf(key: keyof Dims, maxOuterCm: number, wallCm: number, dmCm: number): number {
    void key; void dmCm;
    return maxOuterCm - 2 * wallCm;
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
    if (input.minFrontOuterMm !== undefined) assertPositive("minFrontOuterMm", input.minFrontOuterMm);
    const displacementL = input.driverDisplacementL ?? 0;
    if (!Number.isFinite(displacementL) || displacementL < 0) throw new Error("driverDisplacementL: ожидалось число не меньше нуля");

    const targetCm3 = litersToCm3(input.vbNetL + displacementL);
    const fixed = input.fixedInnerCm ?? {};
    const ratioArr = input.ratio ?? [1, 1, 1];
    const ratioOf: Record<keyof Dims, number> = { w: ratioArr[0], h: ratioArr[1], d: ratioArr[2] };
    for (const key of SIDES) {
        if (fixed[key] !== undefined) assertPositive(`fixedInnerCm.${key}`, fixed[key]!);
        if (input.maxOuterCm?.[key] !== undefined) assertPositive(`maxOuterCm.${key}`, input.maxOuterCm[key]!);
        if (!Number.isFinite(ratioOf[key]) || ratioOf[key] <= 0) throw new Error(`ratio.${key}: ожидалось положительное число`);
    }

    const freeSides = SIDES.filter((k) => fixed[k] === undefined);
    const fixedVolume = SIDES.filter((k) => fixed[k] !== undefined).reduce((a, k) => a * (fixed[k] as number), 1);

    // Даже фиксированный размер не делает физически невозможную нишу допустимой:
    // сначала проверяем, что снаружи вообще остаётся место для стенок (и динамика).
    for (const k of SIDES) {
        const max = input.maxOuterCm?.[k];
        if (max !== undefined && innerCapOf(k, max, wallCm, dmCm) <= 0) {
            throw new Error(`maxOuterCm.${k}: габарит слишком мал для стенок короба${k === "d" && dmCm > 0 ? " и глубины динамика" : ""}`);
        }
    }

    const scale = scaleFor(targetCm3, fixedVolume, freeSides.map((k) => ratioOf[k]));

    // Сначала свободные стороны по пропорции, потом ограничения ниши.
    const inner: Dims = { w: 0, h: 0, d: 0 };
    for (const k of SIDES) {
        const raw = fixed[k] ?? scale * ratioOf[k];
        const max = input.maxOuterCm?.[k];
        if (fixed[k] === undefined && max !== undefined) {
            const cap = innerCapOf(k, max, wallCm, dmCm);
            inner[k] = Math.min(raw, cap);
        } else inner[k] = raw;
    }

    const frontPanelReasons: string[] = [];
    let frontWasExpanded = false;
    if (input.minFrontOuterMm !== undefined) {
        const minFrontInnerCm = Math.max(0, mmToCm(input.minFrontOuterMm) - 2 * wallCm);
        for (const key of ["w", "h"] as const) {
            const max = input.maxOuterCm?.[key];
            const cap = max === undefined ? Number.POSITIVE_INFINITY : innerCapOf(key, max, wallCm, dmCm);
            if (fixed[key] !== undefined) {
                if (inner[key] < minFrontInnerCm) {
                    const actualOuter = inner[key] + 2 * wallCm;
                    frontPanelReasons.push(`наружная сторона ${key.toUpperCase()} ${cmToMm(actualOuter).toFixed(0)} мм меньше номинального диаметра динамика ${input.minFrontOuterMm.toFixed(0)} мм`);
                }
            } else if (cap < minFrontInnerCm) {
                frontPanelReasons.push(`по стороне ${key.toUpperCase()} ниша меньше требуемых ${input.minFrontOuterMm.toFixed(0)} мм для передней панели динамика`);
            } else if (inner[key] < minFrontInnerCm) {
                inner[key] = minFrontInnerCm;
                frontWasExpanded = true;
            }
        }

        // Если автоматический подбор увеличил лицевую панель, пересчитываем
        // свободную глубину, чтобы сохранить заданный нетто-объём.
        if (frontWasExpanded && fixed.d === undefined) {
            const targetDepth = targetCm3 / (inner.w * inner.h);
            const maxDepth = input.maxOuterCm?.d;
            inner.d = maxDepth === undefined
                ? targetDepth
                : Math.min(targetDepth, innerCapOf("d", maxDepth, wallCm, dmCm));
        }
    }

    const roundedInner: Dims = { w: roundToMm(inner.w), h: roundToMm(inner.h), d: roundToMm(inner.d) };
    const grossVolumeL = volumeLiters(roundedInner);
    const volumeL = grossVolumeL - displacementL;
    assertPositive("Нетто-объём после вычета вытеснения", volumeL);
    const errorL = volumeL - input.vbNetL;
    const outerCm = outerFromInner(roundedInner, wallCm, dmCm);

    const reasons: string[] = [...frontPanelReasons];
    if (dmCm > roundedInner.d + wallCm) {
        reasons.push(`Глубина установки ${cmToMm(dmCm)} мм превышает доступные ${cmToMm(roundedInner.d + wallCm).toFixed(0)} мм от наружной поверхности передней панели до задней стенки. Увеличьте глубину короба.`);
    }
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
        grossVolumeL,
        errorL,
        reasons,
    };
}
