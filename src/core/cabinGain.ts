import { assertFinite, assertPositive } from "./assert";

/**
 * Подъём низких частот из-за салона автомобиля (cabin gain).
 * Условная модель: гладкий колокол по логарифму частоты вокруг центра подъёма.
 * Не сверена с WinISD или SpeakerShop, подбирается под машину на слух или по замеру.
 * Влияет только на график, не на fc, Qtc и f3.
 */
export interface CabinGain {
    enabled: boolean;
    /** Высота подъёма в центре, дБ. */
    boostDb: number;
    /** Частота центра подъёма, Гц. */
    centerHz: number;
    /** Ширина колокола в октавах (на уровне exp(-1/2)). */
    widthOct: number;
}

export const CABIN_GAIN_DEFAULT: CabinGain = {
    enabled: false,
    boostDb: 3,
    centerHz: 60,
    widthOct: 1.0,
};

/** Поправка салона в дБ на частоте f. Гладкая по всей оси, без изломов. */
export function cabinGainDb(f: number, cg: CabinGain): number {
    if (!cg.enabled) return 0;
    assertPositive("f", f);
    assertPositive("centerHz", cg.centerHz);
    assertPositive("widthOct", cg.widthOct);
    assertFinite("boostDb", cg.boostDb);
    const octaves = Math.log2(f / cg.centerHz);
    return cg.boostDb * Math.exp(-(octaves * octaves) / (2 * cg.widthOct * cg.widthOct));
}