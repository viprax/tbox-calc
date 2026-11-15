import { boxPanels } from "../core/boxConstruction";
import type { BoxDimensionsResult, MaterialKey } from "../core/boxDimensions";
import type { DriverInstallation } from "../core/driverInstallation";

export function BoxDrawing({ box, material, installation, volumeKnown = true }: { box: BoxDimensionsResult; material: MaterialKey; installation: DriverInstallation; volumeKnown?: boolean }) {
    const { panels, thicknessMm, outer } = boxPanels(box, material);
    const notes = [...(!volumeKnown ? ["Вытеснение динамика неизвестно: чистый объём не подтверждён."] : []), ...box.reasons, ...installation.problems, ...installation.missing];
    const cutoutKnown = installation.centerSpecified && installation.cutoutDiameterMm !== null;
    return <section className="grid min-w-0 gap-5 p-3 sm:p-5" aria-label="Размерный чертёж панелей">
        <div><h2 className="font-semibold">Чертёж деталей · 6 панелей</h2><p className="mt-2 text-sm text-zinc-400">Прямые стыки: передняя и задняя панели накладные; боковины между ними во всю высоту; верх и низ между боковинами. Толщина всех деталей {thicknessMm} мм.</p></div>
        <div className="grid gap-4 md:grid-cols-3">{panels.map((panel, index) => {
            const scale = 190 / Math.max(panel.widthMm, panel.heightMm);
            const x = 150 - panel.widthMm * scale / 2, y = 125 - panel.heightMm * scale / 2;
            return <figure key={panel.name} className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
                <svg viewBox="0 0 300 270" className="h-auto w-full" role="img" aria-label={`${panel.name}, ${panel.quantity} шт., ${panel.widthMm} × ${panel.heightMm} × ${thicknessMm} мм`}>
                    <rect x={x} y={y} width={panel.widthMm * scale} height={panel.heightMm * scale} fill="#27272a" stroke="#fb923c" />
                    {index === 0 && cutoutKnown && <>
                        <circle cx={x + installation.centerMm.x * scale} cy={y + installation.centerMm.y * scale} r={installation.cutoutDiameterMm! / 2 * scale} stroke={installation.cutoutFits ? "#38bdf8" : "#f87171"} fill="none" strokeDasharray="4 3" />
                        <path d={`M${x},${y + installation.centerMm.y * scale}h${installation.centerMm.x * scale} M${x + installation.centerMm.x * scale},${y}v${installation.centerMm.y * scale}`} stroke="#38bdf8" strokeDasharray="2 3" />
                    </>}
                    <text x="150" y={y-10} textAnchor="middle" fill="#e4e4e7" fontSize="12">{panel.widthMm} мм</text>
                    <text x={x-10} y="125" textAnchor="middle" transform={`rotate(-90 ${x-10} 125)`} fill="#e4e4e7" fontSize="12">{panel.heightMm} мм</text>
                    <text x="150" y="252" textAnchor="middle" fill="#a1a1aa" fontSize="11">{index === 0 ? cutoutKnown ? "Вырез только на передней панели" : "Передняя: вырез не задан" : `${panel.quantity} одинаковые детали`}</text>
                </svg>
                <figcaption className="px-2 pb-2 text-sm">{panel.name} · {panel.quantity} шт.<p className="mt-1 text-xs text-zinc-400">{panel.joint}</p></figcaption>
            </figure>;
        })}</div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Размеры прямоугольных заготовок в миллиметрах</caption><thead className="text-xs text-zinc-400"><tr><th className="p-2">Деталь</th><th className="p-2">Шт.</th><th className="p-2">Длина × ширина × толщина, мм</th></tr></thead><tbody>{panels.map(panel => <tr key={panel.name} className="border-t border-zinc-800"><th scope="row" className="p-2 font-normal">{panel.name}</th><td className="p-2">{panel.quantity}</td><td className="p-2">{panel.widthMm} × {panel.heightMm} × {thicknessMm}</td></tr>)}</tbody></table></div>
        <div className="grid gap-2 text-sm text-zinc-300">
            <p>Передняя панель {outer.w} × {outer.h} мм; координаты от её левого верхнего угла при взгляде снаружи.</p>
            {cutoutKnown ? <p>Вырез Ø{installation.cutoutDiameterMm} мм. Центр: X = {installation.centerMm.x} мм, Y = {installation.centerMm.y} мм. Задняя панель без выреза.</p> : <p className="text-amber-300">Чертёж выреза неполный: задайте диаметр и положение центра.</p>}
            <p>Монтажная глубина: {installation.mountingDepthMm === null ? "не задана" : `${installation.mountingDepthMm} мм`}; доступно {installation.availableDepthMm} мм. Зазор сзади: {installation.rearGapMm === null ? "неизвестен" : `${installation.rearGapMm.toFixed(1)} мм`}; заданный минимум {installation.rearClearanceMm} мм.</p>
            <p>Брутто-полость: {box.grossVolumeL.toFixed(2)} л; {volumeKnown ? "нетто после заданных вычетов" : "предварительно без вычета динамика"}: {box.volumeL.toFixed(2)} л.</p>
        </div>
        {notes.length > 0 && <div role="status" className="grid gap-1 border-l-2 border-amber-500 pl-3 text-sm text-amber-300"><p>Перед изготовлением устраните ограничения:</p>{notes.map(note => <p key={note}>{note}</p>)}</div>}
        <p className="text-xs text-zinc-400">Размеры — готовые заготовки, припуск и ширина пропила не включены. Крепёж, герметизация, распорки и вентиляция динамика проверяются отдельно. Это список деталей, не карта раскроя листа.</p>
    </section>;
}
