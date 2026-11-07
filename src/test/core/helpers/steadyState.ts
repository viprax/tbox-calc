/**
 * Численное установившееся усиление ФВЧ 2-го порядка (закрытый ящик).
 * Интегрируем ФНЧ-уравнение RK4, ФВЧ получаем как 1 - ФНЧ.
 */
export function steadyStateHpGain(f: number, fc: number, qtc: number): number {
    const wc = 2 * Math.PI * fc;
    const w = 2 * Math.PI * f;
    const dt = 1 / (f * 200);
    const steps = Math.ceil((30 / f) / dt);

    const deriv = (t: number, x: number, v: number): [number, number] => [
        v,
        -(wc / qtc) * v - wc * wc * x + wc * wc * Math.sin(w * t),
    ];

    let x = 0, v = 0, t = 0, maxLp = 0, maxU = 0;
    const measureFrom = Math.floor(steps * 0.7);
    for (let i = 0; i < steps; i++) {
        const h = dt;
        const [k1x, k1v] = deriv(t, x, v);
        const [k2x, k2v] = deriv(t + h / 2, x + (h / 2) * k1x, v + (h / 2) * k1v);
        const [k3x, k3v] = deriv(t + h / 2, x + (h / 2) * k2x, v + (h / 2) * k2v);
        const [k4x, k4v] = deriv(t + h, x + h * k3x, v + h * k3v);
        x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
        v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
        t += h;
        if (i >= measureFrom) {
            maxLp = Math.max(maxLp, Math.abs(x));
            maxU = Math.max(maxU, Math.abs(Math.sin(w * t)));
        }
    }
    return Math.abs(1 - maxLp / maxU);
}

/** Установившаяся амплитуда ФНЧ-отклика x на синус u = sin(wt), численно (RK4). */
export function steadyStateLpGain(f: number, fc: number, qtc: number): number {
    const wc = 2 * Math.PI * fc;
    const w = 2 * Math.PI * f;
    const dt = 1 / (f * 200);
    const periods = 60;                       // больше периодов, чтобы установиться и на низких частотах
    const steps = Math.ceil((periods / f) / dt);

    const deriv = (t: number, x: number, v: number): [number, number] => [
        v,
        -(wc / qtc) * v - wc * wc * x + wc * wc * Math.sin(w * t),
    ];

    let x = 0, v = 0, t = 0, maxX = 0;
    const measureFrom = Math.floor(steps * 0.5); // последняя половина, не треть
    for (let i = 0; i < steps; i++) {
        const h = dt;
        const [k1x, k1v] = deriv(t, x, v);
        const [k2x, k2v] = deriv(t + h / 2, x + (h / 2) * k1x, v + (h / 2) * k1v);
        const [k3x, k3v] = deriv(t + h / 2, x + (h / 2) * k2x, v + (h / 2) * k2v);
        const [k4x, k4v] = deriv(t + h, x + h * k3x, v + h * k3v);
        x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
        v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
        t += h;
        if (i >= measureFrom) maxX = Math.max(maxX, Math.abs(x));
    }
    return maxX;
}