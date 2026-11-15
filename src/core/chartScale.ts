/** Общая шкала АЧХ: весь отклик виден, с запасом и читаемыми делениями. */
export function dbScale(values: readonly number[]): { min: number; max: number; ticks: number[] } {
    let min = -24;
    let max = 6;
    for (const value of values) {
        if (!Number.isFinite(value)) continue;
        min = Math.min(min, value - 3);
        max = Math.max(max, value + 3);
    }
    const span = max - min;
    const step = [3, 6, 12, 24, 48, 96].find((s) => span / s <= 8) ?? 10 ** Math.ceil(Math.log10(span / 8));
    min = Math.floor(min / step) * step;
    max = Math.ceil(max / step) * step;
    const ticks = [];
    for (let i = 0; i <= Math.round((max - min) / step); i++) ticks.push(max - i * step);
    return { min, max, ticks };
}
