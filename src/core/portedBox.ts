import { assertPositive } from "./assert.ts";
import type { BoxWarning } from "./warnings.ts";
import { SOUND_SPEED_CM_S, END_CORRECTION_FACTOR, PORT_VELOCITY_WARN_MS, PORT_MIN_LENGTH_CM } from "../test/core/constants.ts";

export interface PortGeometry {
    /** Площадь сечения порта, см². */
    spCm2: number;
    /** Геометрическая длина трубы, см. */
    lvCm: number;
}

export interface PortedBoxResult {
    /** Частота настройки порта, Гц. */
    fbHz: number;
    /** Эффективная длина с поправкой на концы, см. */
    leffCm: number;
    /** Радиус порта, см. */
    rCm: number;
    /** Пиковая скорость воздуха в порту на Fb, м/с. */
    peakVelocityMs: number;
}

/** Радиус круглого порта по площади сечения, см. */
export function portRadiusCm(spCm2: number): number {
    assertPositive("spCm2", spCm2);
    return Math.sqrt(spCm2 / Math.PI);
}

/** Эффективная длина порта: геометрическая плюс поправка на концы, см. */
export function effectiveLengthCm(lvCm: number, spCm2: number): number {
    assertPositive("lvCm", lvCm);
    return lvCm + END_CORRECTION_FACTOR * portRadiusCm(spCm2);
}

/** Частота настройки порта (резонанс Гельмгольца), Гц. vbL - чистый объём ящика, литры. */
export function tuningHz(vbL: number, geom: PortGeometry): number {
    assertPositive("vbL", vbL);
    assertPositive("spCm2", geom.spCm2);
    const vbCm3 = vbL * 1000;
    const leff = effectiveLengthCm(geom.lvCm, geom.spCm2);
    return (SOUND_SPEED_CM_S / (2 * Math.PI)) * Math.sqrt(geom.spCm2 / (vbCm3 * leff));
}

/**
 * Обратная задача: геометрическая длина трубы, дающая нужную Fb.
 * Возвращает null, если длина получается не положительной.
 */
export function lvForTuning(vbL: number, spCm2: number, fbHz: number): number | null {
    assertPositive("vbL", vbL);
    assertPositive("spCm2", spCm2);
    assertPositive("fbHz", fbHz);
    const vbCm3 = vbL * 1000;
    const leff = ((SOUND_SPEED_CM_S / (2 * Math.PI * fbHz)) ** 2) * (spCm2 / vbCm3);
    const lv = leff - END_CORRECTION_FACTOR * portRadiusCm(spCm2);
    return lv > 0 ? lv : null;
}

/**
 * Полный расчёт порта.
 * sdCm2 и xmaxMm - из параметров динамика (Sd и Xmax).
 */
export function portedBox(
    vbL: number,
    geom: PortGeometry,
    sdCm2: number,
    xmaxMm: number,
): PortedBoxResult {
    assertPositive("sdCm2", sdCm2);
    assertPositive("xmaxMm", xmaxMm);
    const fbHz = tuningHz(vbL, geom);
    const vdCm3 = sdCm2 * (xmaxMm / 10); // объём, который вытесняет диффузор на полном ходе, см³
    const peakCmS = (vdCm3 * 2 * Math.PI * fbHz) / geom.spCm2;
    return {
        fbHz,
        leffCm: effectiveLengthCm(geom.lvCm, geom.spCm2),
        rCm: portRadiusCm(geom.spCm2),
        peakVelocityMs: peakCmS / 100,
    };
}

/** Предупреждения по порту в формате BoxWarning. Пустой список - порт в норме. */
export function checkPort(result: PortedBoxResult, geom: PortGeometry): BoxWarning[] {
    const out: BoxWarning[] = [];
    if (result.peakVelocityMs > PORT_VELOCITY_WARN_MS) {
        out.push({
            code: "port_velocity_high",
            level: "warn",
            message: `Скорость воздуха в порту ${result.peakVelocityMs.toFixed(1)} м/с: выше ${PORT_VELOCITY_WARN_MS} м/с, возможен шум. Увеличь сечение порта.`,
        });
    }
    if (geom.lvCm < PORT_MIN_LENGTH_CM) {
        out.push({
            code: "port_too_short",
            level: "warn",
            message: `Длина порта ${geom.lvCm} см слишком мала для стабильной настройки. Увеличь длину или уменьши сечение.`,
        });
    }
    return out;
}