import { useMemo, useState } from "react";
import { calculateClosedBox } from "../core/closedBoxCalculation";
import { MATERIALS, type Dims, type MaterialKey } from "../core/boxDimensions";
import type { DriverTS } from "../core/types";
import { FieldWithHint } from "../components/FieldWithHint";
import { ResponseChart } from "../components/ResponseChart";
import { MetricsRow } from "../components/MetricsRow";
import { WarningBar } from "../components/WarningBar";
import { CABIN_GAIN_DEFAULT, type CabinGain } from "../core/cabinGain.ts";
import { PresetSelect } from "../components/PresetSelect";
import { BoxSizePanel } from "../components/BoxSizePanel";

/** Пример из переписки. Параметры неподтверждённые: проверь по даташиту. */

const EXAMPLE: DriverTS = {
    fs: 32.3,
    qts: 0.28,
    vas: 50.8,
    sd: 750,
    xmax: 20,
    qms: 3.55,
    qes: 0.304,
    re: 2,
    le: 0,
    bl: 22.4,
    mms: 380,
};

const panel = "grid content-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3";
type View = "chart" | "2d" | "3d";

function fieldError(name: string, v: number): string | null {
    if (!Number.isFinite(v)) return `${name}: введи число`;
    if (v <= 0) return `${name}: значение должно быть больше нуля`;
    return null;
}

export function ClosedBoxPage() {
    const [ts, setTs] = useState<DriverTS>(EXAMPLE);
    const [vb, setVb] = useState(20);
    const [cabin, setCabin] = useState<CabinGain>(CABIN_GAIN_DEFAULT);
    const [view, setView] = useState<View>("chart");
    const [customDims, setCustomDims] = useState(false);
    const [dimsMm, setDimsMm] = useState<Dims>({ w: 271, h: 271, d: 271 });
    const [limitsEnabled, setLimitsEnabled] = useState(false);
    const [limitsMm, setLimitsMm] = useState<Dims>({ w: 900, h: 500, d: 700 });
    const [material, setMaterial] = useState<MaterialKey>("plywood");
    const [nominalDiameterInch, setNominalDiameterInch] = useState<number | null>(15);
    const [cutoutDiameterMm, setCutoutDiameterMm] = useState<number | null>(null);
    const [frontClearanceMm, setFrontClearanceMm] = useState(15);
    const [driverDepthMm, setDriverDepthMm] = useState(0);
    const [driverDisplacementL, setDriverDisplacementL] = useState(0);
    const driverGeometryError = !Number.isFinite(driverDepthMm) || driverDepthMm < 0
        ? "Глубина установки должна быть числом не меньше нуля"
        : !Number.isFinite(driverDisplacementL) || driverDisplacementL < 0
            ? "Вытеснение должно быть числом не меньше нуля" : null;

    const errors = {
        fs: fieldError("Fs", ts.fs),
        qts: fieldError("Qts", ts.qts),
        vas: fieldError("Vas", ts.vas),
        vb: fieldError("Vb", vb),
    };
    const cutoutError = cutoutDiameterMm === null ? null : fieldError("Диаметр выреза", cutoutDiameterMm);
    const nominalDiameterError = nominalDiameterInch === null ? null : fieldError("Диаметр динамика", nominalDiameterInch);
    const frontClearanceError = !Number.isFinite(frontClearanceMm)
        ? "Запас: введи число"
        : frontClearanceMm < 0 ? "Запас должен быть не меньше нуля" : null;
    const frontDiameterCandidates = [
        ...(nominalDiameterInch !== null && !nominalDiameterError ? [nominalDiameterInch * 25.4] : []),
        ...(cutoutDiameterMm !== null && !cutoutError ? [cutoutDiameterMm] : []),
    ];
    const minFrontOuterMm = frontDiameterCandidates.length > 0
        ? Math.max(...frontDiameterCandidates) + 2 * (frontClearanceError ? 0 : frontClearanceMm)
        : undefined;
    const minOuterMm = MATERIALS[material].thicknessMm * 2 + 1;
    const geometryErrors = {
        ...(customDims ? Object.fromEntries(Object.entries(dimsMm).map(([k, v]) => [`dim${k}`, fieldError(`Размер ${k}`, v)])) : {}),
        ...(limitsEnabled ? Object.fromEntries(Object.entries(limitsMm).map(([k, v]) => [`limit${k}`, fieldError(`Ограничение ${k}`, v) ?? (v < minOuterMm ? `Минимальный габарит с учётом стенок — ${minOuterMm} мм` : null)])) : {}),
    };
    const valid = Object.values(errors).every((e) => e === null) && Object.values(geometryErrors).every((e) => e === null) && !driverGeometryError && !cutoutError && !nominalDiameterError && !frontClearanceError;
    const dimsCm = { w: dimsMm.w / 10, h: dimsMm.h / 10, d: dimsMm.d / 10 };
    const limitsCm = { w: limitsMm.w / 10, h: limitsMm.h / 10, d: limitsMm.d / 10 };

    const calculation = useMemo(
        () => { try { return { value: valid ? calculateClosedBox({
            ts,
            dimensions: {
                vbNetL: vb,
                material,
                dmCm: driverDepthMm / 10,
                driverDisplacementL,
                ...(minFrontOuterMm !== undefined ? { minFrontOuterMm } : {}),
                ...(customDims ? { fixedInnerCm: dimsCm } : {}),
                ...(limitsEnabled ? { maxOuterCm: limitsCm } : {}),
            },
            type: "subwoofer",
        }) : null, error: null }; } catch (error) { return { value: null, error: error instanceof Error ? error.message : "Проверьте параметры короба" }; } },
        [valid, ts, vb, material, minFrontOuterMm, customDims, dimsMm, limitsEnabled, limitsMm, driverDepthMm, driverDisplacementL],
    );
    const box = calculation.value?.dimensions ?? null;
    const result = calculation.value?.response ?? null;
    const warnings = calculation.value?.warnings ?? [];
    const geometryFits = box?.fits ?? true;
    const dimensionReasons = box?.reasons ?? [];

    const set = (key: keyof DriverTS) => (v: number) => setTs((prev) => ({ ...prev, [key]: v }));

    return (
        <div className="mx-auto grid max-w-6xl gap-5 p-4 lg:p-6">
            <main className="grid content-start gap-4">
                {result ? (
                    <>
                        <MetricsRow qtc={result.qtc} fc={result.fc} f3={result.f3} peakDb={result.peakDb} />
                        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
                                <div className="flex gap-1 rounded-lg bg-zinc-950 p-1" aria-label="Вид расчёта">
                                    {([["chart", "График"], ["2d", "2D короб"], ["3d", "3D"]] as const).map(([id, title]) =>
                                        <button key={id} onClick={() => setView(id)} className={`rounded-md px-3 py-1.5 text-sm transition ${view === id ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-zinc-100"}`}>{title}</button>
                                    )}
                                </div>
                {view === "chart" && <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"><input className="size-4 accent-orange-500" type="checkbox" checked={cabin.enabled} onChange={(e) => setCabin((c) => ({ ...c, enabled: e.target.checked }))} />Учитывать салон автомобиля</label>}
                            </div>
                            {view === "chart" ? <div className="mx-auto max-w-3xl p-3"><ResponseChart fc={result.fc} qtc={result.qtc} cabin={cabin} /></div> : view === "2d" ? <BoxSizePanel box={box} material={material} cutoutDiameterMm={cutoutError ? null : cutoutDiameterMm} driverDisplacementL={driverDisplacementL} driverDepthMm={driverDepthMm} /> : <div className="grid min-h-64 place-items-center p-8 text-center"><div><div className="mb-2 text-4xl text-zinc-600">◇</div><h2 className="font-medium">3D-проекция появится позже</h2><p className="mt-1 text-sm text-zinc-500">Сначала подготовим и проверим 2D-чертёж.</p></div></div>}
                        </div>
                        {(warnings.length > 0 || geometryFits) && <WarningBar warnings={warnings} />}
                        {!geometryFits && view !== "2d" && <div className="grid gap-2">{dimensionReasons.map((reason) => <p key={reason} className="rounded border-l-4 border-amber-500 bg-zinc-900 px-3 py-2 text-sm text-amber-300">Габариты короба: {reason}</p>)}</div>}
                    </>
                ) : (
                    <p className="text-zinc-400">Заполни все поля положительными числами.</p>
                )}
            </main>
            <section className={panel}>
                <div className="flex gap-2"><button onClick={() => setView("chart")} className="rounded bg-zinc-800 px-3 py-2 text-sm">Параметры динамика</button><button onClick={() => setView("2d")} className="rounded bg-zinc-800 px-3 py-2 text-sm">Геометрия короба</button></div>
                {calculation.error && <p role="alert" className="text-sm text-red-400">{calculation.error}</p>}
                <div hidden={view !== "chart"} className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-zinc-100">Параметры расчёта</h2><p className="text-xs text-zinc-500">Задайте параметры динамика и объём закрытого ящика</p></div><PresetSelect onChange={(driver, diameterInch) => { setTs(driver); setNominalDiameterInch(diameterInch ?? null); }} /></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FieldWithHint label="Fs" unit="Гц" hint="Резонанс динамика в свободном воздухе. Значение из даташита." value={ts.fs} error={errors.fs} onChange={set("fs")} />
                    <FieldWithHint label="Qts" hint="Полная добротность динамика. Обычно берётся из даташита." value={ts.qts} step={0.01} error={errors.qts} onChange={set("qts")} />
                    <FieldWithHint label="Vas" unit="л" hint="Эквивалентный объём подвеса динамика." value={ts.vas} error={errors.vas} onChange={set("vas")} />
                    <FieldWithHint label="Vb (нетто)" unit="л" hint="Полезный внутренний объём ящика без учёта вытеснения динамика." value={vb} error={errors.vb} onChange={setVb} />
                </div>
                </div>
                <div hidden={view !== "2d"} className="grid gap-3">
                <h2 className="font-semibold">Геометрия и ограничения</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="grid max-w-sm gap-1 text-sm text-zinc-400">Материал стенок<select value={material} onChange={(e) => setMaterial(e.target.value as MaterialKey)} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100">{Object.entries(MATERIALS).map(([key, value]) => <option key={key} value={key}>{value.label} · {value.thicknessMm} мм</option>)}</select></label>
                    <label className="grid max-w-sm gap-1 text-sm text-zinc-400">Номинальный диаметр динамика, дюймы<input type="number" min="0.1" step="0.1" value={nominalDiameterInch ?? ""} onChange={(e) => setNominalDiameterInch(e.target.value === "" ? null : Number(e.target.value))} className={`rounded-md border bg-zinc-950 px-3 py-2 text-zinc-100 ${nominalDiameterError ? "border-red-500" : "border-zinc-700"}`} /><span className="text-xs text-zinc-500">Для Edge 15″ это 381 мм. Точный размер рамы проверьте по документации; он может отличаться.</span>{nominalDiameterError && <span className="text-xs text-red-400">{nominalDiameterError}</span>}</label>
                    <label className="grid max-w-sm gap-1 text-sm text-zinc-400">Диаметр выреза динамика, мм<input type="number" min="1" step="1" value={cutoutDiameterMm ?? ""} onChange={(e) => setCutoutDiameterMm(e.target.value === "" ? null : Number(e.target.value))} className={`rounded-md border bg-zinc-950 px-3 py-2 text-zinc-100 ${cutoutError ? "border-red-500" : "border-zinc-700"}`} /><span className="text-xs text-zinc-500">Введите точный диаметр выреза из документации; значение влияет только на чертёж.</span>{cutoutError && <span className="text-xs text-red-400">{cutoutError}</span>}</label>
                    <label className="grid max-w-sm gap-1 text-sm text-zinc-400">Запас панели вокруг динамика, мм/сторону<input type="number" min="0" step="1" value={Number.isFinite(frontClearanceMm) ? frontClearanceMm : ""} onChange={(e) => setFrontClearanceMm(e.target.value === "" ? NaN : Number(e.target.value))} className={`rounded-md border bg-zinc-950 px-3 py-2 text-zinc-100 ${frontClearanceError ? "border-red-500" : "border-zinc-700"}`} /><span className="text-xs text-zinc-500">Добавляется с каждой стороны к большему из номинального диаметра и выреза. Расположение винтов проверяйте по чертежу динамика.</span>{frontClearanceError && <span className="text-xs text-red-400">{frontClearanceError}</span>}</label>
                    <label className="grid max-w-sm gap-1 text-sm text-zinc-400">Глубина установки, мм<input type="number" min="0" step="1" value={Number.isFinite(driverDepthMm) ? driverDepthMm : ""} onChange={(e) => setDriverDepthMm(e.target.value === "" ? NaN : Number(e.target.value))} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" /><span className="text-xs text-zinc-500">От наружной поверхности передней панели до конца магнита. Проверяется размещение внутри короба; вентиляционный зазор уточните по паспорту. 0 — не задано.</span></label>
                    <label className="grid max-w-sm gap-1 text-sm text-zinc-400">Вытеснение динамика, л<input type="number" min="0" step="0.1" value={Number.isFinite(driverDisplacementL) ? driverDisplacementL : ""} onChange={(e) => setDriverDisplacementL(e.target.value === "" ? NaN : Number(e.target.value))} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" /><span className="text-xs text-zinc-500">Прибавляется к требуемому геометрическому объёму; АЧХ считается по нетто-объёму после вычета. 0 л, если размер неизвестен.</span></label>
                </div>
                {driverGeometryError && <p className="text-xs text-red-400">{driverGeometryError}</p>}
                <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-zinc-800 pt-3 text-sm">
                    <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" className="size-4 accent-orange-500" checked={customDims} onChange={(e) => setCustomDims(e.target.checked)} />Задать внутренние размеры вручную</label>
                    <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" className="size-4 accent-orange-500" checked={limitsEnabled} onChange={(e) => setLimitsEnabled(e.target.checked)} />Ограничить габариты багажника</label>
                </div>
                {customDims && <div className="grid gap-3 sm:grid-cols-3">{([['w','Ширина'],['h','Высота'],['d','Глубина']] as const).map(([key,label]) => <label key={key} className="grid gap-1 text-xs text-zinc-400">{label} внутри, мм<input type="number" min="1" step="1" value={Number.isFinite(dimsMm[key]) ? dimsMm[key] : ""} onChange={(e) => setDimsMm((d) => ({...d, [key]: e.target.value === "" ? NaN : Number(e.target.value)}))} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />{geometryErrors[`dim${key}`] && <span className="text-red-400">{geometryErrors[`dim${key}`]}</span>}</label>)}</div>}
                {limitsEnabled && <div><p className="mb-2 text-xs text-zinc-500">Максимальный внешний размер багажника, мм</p><div className="grid gap-3 sm:grid-cols-3">{([['w','Ширина'],['h','Высота'],['d','Глубина']] as const).map(([key,label]) => <label key={key} className="grid gap-1 text-xs text-zinc-400">{label}<input type="number" min="1" step="1" value={Number.isFinite(limitsMm[key]) ? limitsMm[key] : ""} onChange={(e) => setLimitsMm((d) => ({...d, [key]: e.target.value === "" ? NaN : Number(e.target.value)}))} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />{geometryErrors[`limit${key}`] && <span className="text-red-400">{geometryErrors[`limit${key}`]}</span>}</label>)}</div></div>}
                {box && <p className="text-xs text-zinc-500">Размеры короба доступны во вкладке «2D короб» · внутренний объём {box.volumeL.toFixed(2)} л</p>}
                </div>
            </section>
        </div>
    );
}
