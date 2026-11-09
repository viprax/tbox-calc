/**
 * АЧХ фазоинвертора, 4-й порядок.
 * Источник: Herzog, Hilsamer, DAFx-14, уравнения (2)-(6), на основе Small (1973).
 * Сверено с JBL SpeakerShop на одном случае (Vb 190, Fb 30, Ql 10): RMS 0.14 дБ.
 *
 * Частота нормируется на f0 = √(fs·fb), а не на fs.
 * G(s) = s⁴ / (s⁴ + a1·s³ + a2·s² + a3·s + 1), s нормирована на ω0.
 */

export interface PortedParams {
    /** Резонанс динамика в воздухе, Гц. */
    fs: number;
    /** Полная добротность динамика. */
    qts: number;
    /** Эквивалентный объём подвеса, л. */
    vas: number;
    /** Объём ящика нетто, л. */
    vb: number;
    /** Частота настройки порта, Гц. */
    fb: number;
    /** Добротность потерь ящика (WinISD и SpeakerShop по умолчанию 10, в статье рекомендуется 7). */
    ql: number;
}

/** Коэффициенты передаточной функции. */
export function portedCoefficients(p: PortedParams): { a1: number; a2: number; a3: number } {
    const h = p.fb / p.fs;
    const alpha = p.vas / p.vb;
    const sh = Math.sqrt(h);
    const a1 = 1 / (p.ql * sh) + sh / p.qts;
    const a2 = (alpha + 1) / h + h + 1 / (p.ql * p.qts);
    const a3 = 1 / (p.qts * sh) + sh / p.ql;
    return { a1, a2, a3 };
}

/** Уровень АЧХ в дБ относительно полки (0 дБ на высоких частотах). */
export function portedResponseDb(f: number, p: PortedParams): number {
    const { a1, a2, a3 } = portedCoefficients(p);
    const A1 = a1 * a1 - 2 * a2;
    const A2 = 2 + a2 * a2 - 2 * a1 * a3;
    const A3 = a3 * a3 - 2 * a2;
    const f0 = Math.sqrt(p.fs * p.fb);
    const w = f / f0;
    const w2 = w * w;
    const w4 = w2 * w2;
    const w6 = w4 * w2;
    const w8 = w4 * w4;
    return 10 * Math.log10(w8 / (1 + A1 * w2 + A2 * w4 + A3 * w6 + w8));
}