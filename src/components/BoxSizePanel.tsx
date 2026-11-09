import { MATERIALS, type BoxDimensionsResult, type MaterialKey } from "../core/boxDimensions";
import { cutoutFitsPanel } from "../core/boxCutout";

export function BoxSizePanel({ box, material, cutoutDiameterMm, driverDisplacementL = 0, driverDepthMm = 0 }: { box: BoxDimensionsResult | null; material: MaterialKey; cutoutDiameterMm?: number | null; driverDisplacementL?: number; driverDepthMm?: number }) {
    if (!box) return <p className="p-8 text-center text-sm text-zinc-400">Введите корректные параметры, чтобы построить короб.</p>;
    const wall = MATERIALS[material].thicknessMm;
    const mm = (cm: number) => Math.round(cm * 10);
    const w = mm(box.innerCm.w), h = mm(box.innerCm.h), d = mm(box.innerCm.d);
    const ow = mm(box.outerCm.w), oh = mm(box.outerCm.h), od = mm(box.outerCm.d);
    const scale = 180 / Math.max(ow, oh, od);
    const centers = [160, 480, 800];
    const centerY = 165;
    const dimensionColor = "#a1a1aa";

    const cutoutFits = cutoutDiameterMm != null && cutoutFitsPanel(cutoutDiameterMm, ow, oh);
    const projection = (centerX: number, widthMm: number, heightMm: number, title: string, widthLabel: string, heightLabel: string, showCutout = false) => {
        const width = widthMm * scale;
        const height = heightMm * scale;
        const x = centerX - width / 2;
        const y = centerY - height / 2;
        const horizontalY = y - 22;
        const verticalX = x - 22;

        return <g key={title}>
            <rect x={x} y={y} width={width} height={height} fill="none" stroke="#fb923c" strokeWidth="2" />
            {showCutout && cutoutFits && <circle cx={centerX} cy={centerY} r={(cutoutDiameterMm * scale) / 2} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 4" />}
            <g stroke={dimensionColor} strokeWidth="1" fill="none">
                <path d={`M${x} ${y - 3}v-5 M${x} ${horizontalY}H${x + width} M${x + width} ${y - 3}v-5`} />
                <path d={`M${x - 3} ${y}h-5 M${verticalX} ${y}V${y + height} M${x - 3} ${y + height}h-5`} />
            </g>
            <g fill="#d4d4d8" fontSize="12" fontFamily="sans-serif" textAnchor="middle">
                <text x={centerX} y={horizontalY - 6}>{widthLabel}</text>
                <text x={verticalX - 7} y={centerY} transform={`rotate(-90 ${verticalX - 7} ${centerY})`}>{heightLabel}</text>
                <text x={centerX} y="300" fontSize="14">{title}</text>
            </g>
        </g>;
    };

    return <div className="grid gap-5 p-4">
        <div className="overflow-x-auto rounded-lg bg-zinc-950/60 p-3">
            <svg viewBox="0 0 960 320" className="mx-auto h-auto min-w-[720px] max-w-5xl" role="img" aria-label={`Ортогональные проекции короба в общем масштабе: внутри ${w} × ${h} × ${d} мм; снаружи ${ow} × ${oh} × ${od} мм`}>
                {projection(centers[0], ow, oh, "Спереди", `${ow} мм`, `${oh} мм`, true)}
                {projection(centers[1], od, oh, "Сбоку", `${od} мм`, `${oh} мм`)}
                {projection(centers[2], ow, od, "Сверху", `${ow} мм`, `${od} мм`)}
            </svg>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-zinc-500">Внутри, мм</p><p className="font-medium">{w} × {h} × {d}</p></div>
            <div><p className="text-xs text-zinc-500">Снаружи, мм</p><p className="font-medium">{ow} × {oh} × {od}</p></div>
            <div><p className="text-xs text-zinc-500">Нетто объём</p><p className="font-medium">{box.volumeL.toFixed(2)} л</p></div>
            <div><p className="text-xs text-zinc-500">Вытеснение динамика</p><p className="font-medium">{driverDisplacementL.toFixed(1)} л</p></div>
            <div><p className="text-xs text-zinc-500">Внутренний геометрический объём</p><p className="font-medium">{box.grossVolumeL.toFixed(2)} л</p></div>
            <div><p className="text-xs text-zinc-500">Глубина установки динамика</p><p className="font-medium">{driverDepthMm} мм</p></div>
            <div><p className="text-xs text-zinc-500">Стенки</p><p className="font-medium">{MATERIALS[material].label}, {wall} мм</p></div>
        </div>
        <p className="text-xs text-zinc-500">Все виды используют один масштаб. {cutoutDiameterMm == null ? "Вырез не показан: задайте диаметр по документации динамика." : cutoutFits ? `Синий круг — вырез Ø${cutoutDiameterMm} мм.` : `Вырез Ø${cutoutDiameterMm} мм не помещается на передней панели ${ow} × ${oh} мм.`} Глубину и вытеснение вводите по документации динамика.</p>
        {box.reasons.map((reason) => <p key={reason} className="text-xs text-amber-300">{reason}</p>)}
    </div>;
}
