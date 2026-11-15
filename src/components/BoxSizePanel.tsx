import { MATERIALS, type BoxDimensionsResult, type MaterialKey } from "../core/boxDimensions";
import { driverInstallation, type DriverInstallation } from "../core/driverInstallation";
import { dimensionsMm } from "../core/boxConstruction";
import { useState } from "react";

export function WedgePrototype() {
    const [widthMm, setWidthMm] = useState(360);
    const [heightMm, setHeightMm] = useState(300);
    const [frontDepthMm, setFrontDepthMm] = useState(280);
    const [rearDepthMm, setRearDepthMm] = useState(180);
    const scale = 300 / Math.max(heightMm, frontDepthMm, rearDepthMm);
    const x = 70, y = 48;
    const front = frontDepthMm * scale, rear = rearDepthMm * scale, height = heightMm * scale;
    const volumeL = widthMm * heightMm * ((frontDepthMm + rearDepthMm) / 2) / 1_000_000;
    const slider = (label: string, value: number, min: number, max: number, onChange: (value: number) => void) => <label className="grid gap-1 text-xs text-zinc-400">{label}<span className="flex items-center gap-3"><input type="range" min={min} max={max} step="10" value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-orange-500"/><span className="w-20 shrink-0 whitespace-nowrap text-right text-sm text-zinc-200">{value} мм</span></span></label>;

    return <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div><h3 className="font-medium">Тест формы «Клин»</h3><p className="mt-1 text-xs text-zinc-500">Меняй глубину сверху и снизу — боковой профиль перестраивается сразу.</p></div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px] md:items-center">
            <div className="rounded-lg bg-zinc-950 p-3">
                <svg viewBox="0 0 440 250" role="img" aria-label={`Боковой профиль клиновидного короба: высота ${heightMm} мм, глубина снизу ${frontDepthMm} мм, сверху ${rearDepthMm} мм`} className="mx-auto h-auto w-full max-w-lg">
                    <path d={`M${x} ${y} H${x + rear} L${x + front} ${y + height} H${x} Z`} fill="rgb(249 115 22 / 0.08)" stroke="#fb923c" strokeWidth="3" strokeLinejoin="round"/>
                    <text x={x + front / 2} y={y + height + 28} textAnchor="middle" fill="#d4d4d8" fontSize="14">Глубина снизу: {frontDepthMm} мм</text>
                    <text x={x + rear / 2} y={y - 14} textAnchor="middle" fill="#d4d4d8" fontSize="14">Сверху: {rearDepthMm} мм</text>
                    <text x="220" y="230" textAnchor="middle" fill="#a1a1aa" fontSize="13">Вид сбоку · ширина короба {widthMm} мм</text>
                </svg>
            </div>
            <div className="grid gap-3">{slider("Ширина", widthMm, 200, 700, setWidthMm)}{slider("Высота", heightMm, 150, 600, setHeightMm)}{slider("Глубина у передней стенки", frontDepthMm, 150, 600, setFrontDepthMm)}{slider("Глубина у задней стенки", rearDepthMm, 100, 500, setRearDepthMm)}<div className="rounded-lg border border-zinc-800 px-3 py-2"><span className="text-xs text-zinc-500">Геометрический объём профиля</span><p className="font-semibold text-zinc-100">{volumeL.toFixed(1)} л</p></div></div>
        </div>
        <p className="text-xs leading-relaxed text-amber-200/80">Демо идеальной трапецеидальной призмы: без толщины стенок и вытеснения. Этот объём не связан с расчётом АЧХ и не является готовыми размерами для сборки.</p>
    </section>;
}

export function BoxSizePanel({ box, material, cutoutDiameterMm, driverDisplacementL = 0, driverDepthMm = 0, installation, volumeKnown = true }: { box: BoxDimensionsResult | null; material: MaterialKey; cutoutDiameterMm?: number | null; driverDisplacementL?: number; driverDepthMm?: number; installation?: DriverInstallation | null; volumeKnown?: boolean }) {
    if (!box) return <p className="p-8 text-center text-sm text-zinc-400">Введите корректные параметры, чтобы построить короб.</p>;
    const wall = MATERIALS[material].thicknessMm;
    const outer = dimensionsMm(box.outerCm), inner = dimensionsMm(box.innerCm);
    const driver = installation ?? driverInstallation(outer, wall, { cutoutDiameterMm, mountingDepthMm: driverDepthMm });
    const scale = 200 / Math.max(outer.w, outer.h, outer.d, driver.frameDiameterMm ?? 0);
    const projection = (kind: "front" | "side" | "top", title: string) => {
        const width = kind === "side" ? outer.d : outer.w;
        const height = kind === "top" ? outer.d : outer.h;
        const x = 180 - width * scale / 2, y = 145 - height * scale / 2;
        const cx = x + driver.centerMm.x * scale, cy = y + driver.centerMm.y * scale;
        const envelopeDiameter = driver.cutoutDiameterMm ?? driver.frameDiameterMm;
        const crossCenter = kind === "side" ? driver.centerMm.y : driver.centerMm.x;
        const envelope = envelopeDiameter !== null && driver.mountingDepthMm !== null;
        return <svg viewBox="0 0 360 320" className="h-auto w-full" role="img" aria-label={`${title}: ${width} × ${height} мм`}>
            <rect x={x} y={y} width={width * scale} height={height * scale} fill="#18181b" stroke="#fb923c" strokeWidth="1.8" />
            {kind !== "front" && <rect x={x + wall * scale} y={y + wall * scale} width={(width - 2 * wall) * scale} height={(height - 2 * wall) * scale} fill="#09090b" stroke="#71717a" strokeWidth="1" />}
            {kind === "front" ? <>
                {driver.frameDiameterMm !== null && <circle cx={cx} cy={cy} r={driver.frameDiameterMm / 2 * scale} fill="#52525b" fillOpacity="0.25" stroke={driver.frameFits === false ? "#f87171" : "#a1a1aa"} strokeDasharray={driver.frameEstimated ? "6 3" : undefined} />}
                {driver.cutoutDiameterMm !== null && <circle cx={cx} cy={cy} r={driver.cutoutDiameterMm / 2 * scale} fill="none" stroke={driver.cutoutFits === false ? "#f87171" : "#38bdf8"} strokeDasharray="4 3" />}
                <path d={`M${cx-6},${cy}h12 M${cx},${cy-6}v12`} stroke="#e4e4e7" />
            </> : envelope && <>
                <rect x={kind === "side" ? x : x + (crossCenter - envelopeDiameter / 2) * scale} y={kind === "side" ? y + (crossCenter - envelopeDiameter / 2) * scale : y} width={(kind === "side" ? driver.mountingDepthMm! : envelopeDiameter) * scale} height={(kind === "side" ? envelopeDiameter : driver.mountingDepthMm!) * scale} fill="#38bdf8" fillOpacity="0.14" stroke={driver.rearGapMm! < driver.rearClearanceMm ? "#f87171" : "#38bdf8"} strokeDasharray="5 3" />
                {kind === "side" && <text x="180" y="272" textAnchor="middle" fill="#7dd3fc" fontSize="11">Глубина {driver.mountingDepthMm} мм · сзади {driver.rearGapMm?.toFixed(1)} мм</text>}
            </>}
            <g fill="#d4d4d8" fontSize="12" textAnchor="middle">
                <text x="180" y={y - 12}>{width} мм</text>
                <text x={x - 12} y="145" transform={`rotate(-90 ${x - 12} 145)`}>{height} мм</text>
                <text x="180" y="300" fontSize="14">{title}</text>
            </g>
        </svg>;
    };
    return <section className="grid gap-4 p-3 sm:p-4" aria-label="Габариты и посадка динамика">
        <div className="grid gap-2 md:grid-cols-3">{projection("front", "Спереди")}{projection("side", "Сбоку")}{projection("top", "Сверху")}</div>
        <p className="text-xs text-zinc-400">Серый — рама {driver.frameDiameterMm === null ? "(диаметр неизвестен)" : `Ø${driver.frameDiameterMm} мм`}{driver.frameEstimated ? " (оценка по номиналу)" : ""}; синий пунктир — {driver.cutoutDiameterMm === null ? "вырез не задан" : `вырез Ø${driver.cutoutDiameterMm} мм`} и монтажный габарит. Красный — конфликт посадки. Все проекции в одном масштабе.</p>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-zinc-500">Внутри, мм</p><p>{inner.w} × {inner.h} × {inner.d}</p></div>
            <div><p className="text-xs text-zinc-500">Снаружи, мм</p><p>{outer.w} × {outer.h} × {outer.d}</p></div>
            <div><p className="text-xs text-zinc-500">{volumeKnown ? "Нетто / брутто" : "Полость / без вычета динамика"}</p><p>{volumeKnown ? `${box.volumeL.toFixed(2)} / ${box.grossVolumeL.toFixed(2)}` : `${box.grossVolumeL.toFixed(2)} / ${box.volumeL.toFixed(2)}`} л</p></div>
            <div><p className="text-xs text-zinc-500">Материал / вытеснение</p><p>{MATERIALS[material].label} {wall} мм / {volumeKnown ? `${driverDisplacementL.toFixed(2)} л` : `учтено только ${driverDisplacementL.toFixed(2)} л деталей`}</p></div>
        </div>
        <p className="text-xs text-zinc-400">Центр: {driver.centerSpecified ? `${driver.centerMm.x} мм слева, ${driver.centerMm.y} мм сверху` : "предварительно по центру панели; координаты не заданы"}. Глубина установки отсчитывается от внешней передней поверхности. Монтажный габарит схематичен; зазор для вентиляции сверяйте с документацией динамика.</p>
        {[...(!volumeKnown ? ["Вытеснение динамика не задано: чистый Vb пока неизвестен."] : []), ...driver.problems, ...driver.missing, ...box.reasons].map((reason) => <p key={reason} className="text-xs text-amber-300">{reason}</p>)}
    </section>;
}
