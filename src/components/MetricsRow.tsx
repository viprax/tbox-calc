import { HintPopover } from "./HintPopover";

interface Props {
    qtc: number;
    fc: number;
    f3: number;
    peakDb: number;
    simple?: boolean;
}

export function MetricsRow({ qtc, fc, f3, peakDb, simple = false }: Props) {
    const items = [
        { label: simple ? "Характер баса" : "Qtc", value: qtc.toFixed(2), hint: "Показывает форму отклика: около 0,7 — ровный переход; меньше — более плавный спад; больше — возможен резонансный подъём. Это не оценка качества динамика." },
        { label: simple ? "Резонанс в корпусе" : "fc", value: `${fc.toFixed(1)} Гц`, hint: "Резонансная частота системы динамик + корпус. Обычно выше свободного резонанса динамика. Чем выше значение, тем раньше может начинаться спад низких частот." },
        { label: simple ? "Нижняя граница баса" : "f3", value: `${f3.toFixed(1)} Гц`, hint: "Частота, где расчётный отклик снижается примерно на 3 дБ относительно верхней полки. Считается без салона и не является абсолютным пределом слышимости баса." },
        ...(!simple ? [{ label: "Горб", value: `${peakDb.toFixed(1)} дБ`, hint: "Расчётный резонансный подъём собственной АЧХ корпуса. Поправка салона сюда не входит." }] : []),
    ];
    return <div aria-label="Акустические метрики" className={`grid overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 ${simple ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {items.map((item, index) => <div key={item.label} className={`min-w-0 border-b border-zinc-800 p-5 last:border-b-0 sm:border-b-0 sm:p-6 ${index > 0 ? "sm:border-l" : ""} ${index === 2 ? "bg-orange-500/8" : ""}`}><span className="flex items-center gap-2 text-xs font-medium text-zinc-400">{item.label}<HintPopover label={item.label} text={item.hint} /></span><b className={`mt-2 block text-3xl font-semibold tracking-[-0.04em] tabular-nums ${index === 2 ? "text-orange-300" : "text-zinc-100"}`}>{item.value}</b></div>)}
    </div>;
}
