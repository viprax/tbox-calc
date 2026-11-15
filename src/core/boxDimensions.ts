import { assertInRange, assertPositive, InvalidInputError } from "./assert";
import { cmToMm, litersToCm3, mmToCm } from "./units";
import { VOLUME_TOLERANCE } from "./constants.ts";

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
    /** Глубина от лицевой поверхности передней стенки до задней точки динамика, см. */
    dmCm?: number;
    /** Вытесненный динамиком, распорками и портом объём, л. */
    displacementL?: number;
    /** Минимальные внешние ширина и высота лицевой панели, мм. */
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
    /** Полный внутренний объём до вычета оборудования, л. */
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

/** Внешние размеры: воздушная полость плюс две стенки по каждой оси. */
export function outerFromInner(inner: Dims, wallCm: number): Dims {
    return {
        w: inner.w + 2 * wallCm,
        h: inner.h + 2 * wallCm,
        d: inner.d + 2 * wallCm,
    };
}

/** Геометрический объём полости в литрах до вычета оборудования. Размеры в см. */
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

/** Внутренний предел по нише: внешний размер минус две стенки. */
export function innerCapOf(_key: keyof Dims, maxOuterCm: number, wallCm: number): number {
    return maxOuterCm - 2 * wallCm;
}

/** Подбор полости с учётом вытеснения, ниши, фиксированных сторон и глубины установки. */
export function solveBoxDimensions(input: BoxDimensionsInput): BoxDimensionsResult {
    assertPositive("vbNetL", input.vbNetL);
    const material = MATERIALS[input.material ?? "plywood"];
    if (!material) throw new InvalidInputError("material: неизвестный материал");
    const wallCm = mmToCm(material.thicknessMm);
    const dmCm = assertInRange("dmCm", input.dmCm ?? 0, 0, Number.MAX_VALUE);
    const displacementL = assertInRange("displacementL", input.displacementL ?? 0, 0, Number.MAX_VALUE);
    const targetCm3 = assertPositive("grossVolume", litersToCm3(input.vbNetL + displacementL));
    const fixed = input.fixedInnerCm ?? {};
    const ratios = input.ratio ?? [1, 1, 1];
    if (ratios.length !== 3) throw new InvalidInputError("ratio: ожидалось три пропорции");
    const ratioOf: Dims = { w: ratios[0], h: ratios[1], d: ratios[2] };
    const frontMin = input.minFrontOuterMm === undefined ? 0.1
        : Math.max(0.1, Math.ceil((assertPositive("minFrontOuterMm", input.minFrontOuterMm) / 10 - 2 * wallCm) * 10 - 1e-9) / 10);
    const lower: Dims = { w: frontMin, h: frontMin, d: Math.max(0.1, Math.ceil((dmCm - wallCm) * 10 - 1e-9) / 10) };
    const upper: Dims = { w: Infinity, h: Infinity, d: Infinity };
    const reasons: string[] = [];

    for (const k of SIDES) {
        assertPositive(`ratio.${k}`, ratioOf[k]);
        if (fixed[k] !== undefined) assertPositive(`fixedInnerCm.${k}`, fixed[k]);
        const max = input.maxOuterCm?.[k];
        if (max !== undefined) {
            assertPositive(`maxOuterCm.${k}`, max);
            // Never round a capped side outside the niche.
            const cap = Math.floor((max - 2 * wallCm) * 10 + 1e-9) / 10;
            if (cap < lower[k]) reasons.push(`по стороне ${k.toUpperCase()} недостаточно места для стенок или динамика`);
            upper[k] = Math.max(0.1, cap);
            lower[k] = Math.min(lower[k], upper[k]);
        }
    }

    const atScale = (scale: number): Dims => {
        const dims = { w: 0, h: 0, d: 0 };
        for (const k of SIDES) {
            dims[k] = fixed[k] ?? Math.min(upper[k], Math.max(lower[k], scale * ratioOf[k]));
        }
        return dims;
    };
    const free = SIDES.filter((k) => fixed[k] === undefined);
    let lo = 0;
    let hi = 1;
    // Monotone bounded scaling redistributes volume when a side reaches its cap.
    if (free.length > 0) {
        while (volumeLiters(atScale(hi)) * 1000 < targetCm3) {
            const dims = atScale(hi);
            if (free.every((k) => dims[k] >= upper[k])) break;
            hi *= 2;
            if (!Number.isFinite(hi)) throw new InvalidInputError("dimensions: слишком большой диапазон");
        }
        for (let i = 0; i < 100; i++) {
            const mid = lo + (hi - lo) / 2;
            if (volumeLiters(atScale(mid)) * 1000 < targetCm3) lo = mid;
            else hi = mid;
        }
    }
    const raw = atScale(hi);
    const innerCm: Dims = { w: roundToMm(raw.w), h: roundToMm(raw.h), d: roundToMm(raw.d) };
    for (const k of SIDES) assertPositive(`innerCm.${k}`, innerCm[k]);
    const outerCm = outerFromInner(innerCm, wallCm);
    const grossVolumeL = assertPositive("grossVolumeL", volumeLiters(innerCm));
    const volumeL = Math.max(0, grossVolumeL - displacementL);
    if (displacementL > grossVolumeL) reasons.push("вытеснение оборудования больше внутреннего объёма корпуса");
    const errorL = volumeL - input.vbNetL;
    for (const k of SIDES) {
        const max = input.maxOuterCm?.[k];
        if (max !== undefined && outerCm[k] > max + 1e-9) {
            reasons.push(`по стороне ${k.toUpperCase()} не хватает ${cmToMm(outerCm[k] - max).toFixed(1)} мм`);
        }
    }
    if (input.minFrontOuterMm !== undefined && [outerCm.w, outerCm.h].some((side) => side * 10 < input.minFrontOuterMm! - 1e-9)) {
        reasons.push(`передняя панель меньше требуемых ${input.minFrontOuterMm} мм для динамика`);
    }
    if (innerCm.d + wallCm < dmCm - 1e-9) {
        reasons.push("глубина полости недостаточна для установки динамика");
    }
    if (Math.abs(errorL) / input.vbNetL > VOLUME_TOLERANCE) {
        reasons.push(`объём ${volumeL.toFixed(2)} л при цели ${input.vbNetL} л, отклонение ${errorL.toFixed(2)} л`);
    }
    return { fits: reasons.length === 0, innerCm, outerCm, volumeL, grossVolumeL, errorL, reasons };
}
