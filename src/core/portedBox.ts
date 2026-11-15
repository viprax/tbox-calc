import { assertInRange, assertPositive } from "./assert.ts";
import type { BoxWarning } from "./warnings.ts";
import { SOUND_SPEED_CM_S, END_CORRECTION_FACTOR, PORT_VELOCITY_WARN_MS, PORT_MIN_LENGTH_CM } from "./constants.ts";

export interface PortGeometry {
    /** Площадь сечения порта, см². */
    spCm2: number;
    /** Геометрическая длина трубы, см. */
    lvCm: number;
    /** Суммарная поправка на концы в радиусах. По умолчанию щит + свободный конец. */
    endCorrectionFactor?: number;
    /** SpeakerShop — отдельная совместимость с сохранёнными программными эталонами. */
    model?: "physical" | "speakershop";
}

export interface PortedBoxResult {
    /** Частота настройки порта, Гц. */
    fbHz: number;
    /** Эффективная длина с поправкой на концы, см. */
    leffCm: number;
    /** Радиус порта, см. */
    rCm: number;
    /** Скорость на Fb из заданного пикового расхода через порт, м/с. Без расхода — null. */
    peakVelocityMs: number | null;
}

/** Радиус круглого порта по площади сечения, см. */
export function portRadiusCm(spCm2: number): number {
    assertPositive("spCm2", spCm2);
    return Math.sqrt(spCm2 / Math.PI);
}

/** Эффективная длина порта: геометрическая плюс поправка на концы, см. */
export function effectiveLengthCm(lvCm: number, spCm2: number, endCorrectionFactor = END_CORRECTION_FACTOR): number {
    assertPositive("lvCm", lvCm);
    assertInRange("endCorrectionFactor", endCorrectionFactor, 0, Number.MAX_VALUE);
    return lvCm + endCorrectionFactor * portRadiusCm(spCm2);
}

/** Частота настройки порта (резонанс Гельмгольца), Гц. vbL - чистый объём ящика, литры. */
export function tuningHz(vbL: number, geom: PortGeometry): number {
    assertPositive("vbL", vbL);
    assertPositive("spCm2", geom.spCm2);
    const vbCm3 = assertPositive("vbCm3", vbL * 1000);
    const factor = geom.endCorrectionFactor ?? (geom.model === "speakershop" ? 2 : END_CORRECTION_FACTOR);
    const leff = effectiveLengthCm(geom.lvCm, geom.spCm2, factor);
    // 356.67 m/s is a legacy program coefficient, not physical room-temperature sound speed.
    const speed = geom.model === "speakershop" ? 35667 : SOUND_SPEED_CM_S;
    return assertPositive("fbHz", (speed / (2 * Math.PI)) * Math.sqrt(geom.spCm2 / (vbCm3 * leff)));
}

/**
 * Обратная задача: геометрическая длина трубы, дающая нужную Fb.
 * Возвращает null, если длина получается не положительной.
 */
export function lvForTuning(vbL: number, spCm2: number, fbHz: number, endCorrectionFactor = END_CORRECTION_FACTOR, soundSpeedCmS = SOUND_SPEED_CM_S): number | null {
    assertPositive("vbL", vbL);
    assertPositive("spCm2", spCm2);
    assertPositive("fbHz", fbHz);
    const vbCm3 = assertPositive("vbCm3", vbL * 1000);
    assertPositive("soundSpeedCmS", soundSpeedCmS);
    const leff = ((soundSpeedCmS / (2 * Math.PI * fbHz)) ** 2) * (spCm2 / vbCm3);
    assertInRange("endCorrectionFactor", endCorrectionFactor, 0, Number.MAX_VALUE);
    const lv = leff - endCorrectionFactor * portRadiusCm(spCm2);
    return lv > 0 ? lv : null;
}

/**
 * Геометрия одного круглого порта и опциональная скорость на Fb.
 * portVolumeFlowCm3S — пиковый расход ЧЕРЕЗ ПОРТ из измерения/модели возбуждения.
 * Sd и Xmax не определяют этот расход: движение порта и диффузора различается.
 */
export function portedBox(
    vbL: number,
    geom: PortGeometry,
    portVolumeFlowCm3S?: number,
): PortedBoxResult {
    const fbHz = tuningHz(vbL, geom);
    const flow = portVolumeFlowCm3S === undefined ? null
        : assertInRange("portVolumeFlowCm3S", portVolumeFlowCm3S, 0, Number.MAX_VALUE);
    return {
        fbHz,
        leffCm: effectiveLengthCm(geom.lvCm, geom.spCm2, geom.endCorrectionFactor ?? (geom.model === "speakershop" ? 2 : END_CORRECTION_FACTOR)),
        rCm: portRadiusCm(geom.spCm2),
        peakVelocityMs: flow === null ? null : flow / geom.spCm2 / 100,
    };
}

/** Предупреждения по порту в формате BoxWarning. Пустой список - порт в норме. */
export function checkPort(result: PortedBoxResult, geom: PortGeometry): BoxWarning[] {
    const out: BoxWarning[] = [];
    if (result.peakVelocityMs === null) {
        out.push({ code: "port_velocity_unknown", level: "info", message: "Скорость воздуха не рассчитана: текущая модель не определяет расход через порт при заданном сигнале. По одним размерам порта скорость определить нельзя." });
    } else if (result.peakVelocityMs > PORT_VELOCITY_WARN_MS) {
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