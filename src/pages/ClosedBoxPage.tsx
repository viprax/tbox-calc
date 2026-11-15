import { lazy, Suspense, useMemo, useState } from "react";
import { MATERIALS, type MaterialKey } from "../core/boxDimensions";
import { dimensionsMm } from "../core/boxConstruction";
import type { DriverTS } from "../core/types";
import { FieldWithHint } from "../components/FieldWithHint";
import { ResponseChart } from "../components/ResponseChart";
import { MetricsRow } from "../components/MetricsRow";
import { WarningBar } from "../components/WarningBar";
import { HintPopover } from "../components/HintPopover";
import { PresetSelect } from "../components/PresetSelect";
import { BoxSizePanel } from "../components/BoxSizePanel";
import { BoxDrawing } from "../components/BoxDrawing";
import { SealedVolumeBalance } from "../components/SealedVolumeBalance";
import { JL_REFERENCE_DRIVER } from "../data/drivers";
import { createSealedDraft, selectDriverPreset, SEALED_PRESETS, type SealedBoxDraft, type SealedView } from "../state/sealedDraft";
import { evaluateSealedDraft } from "../state/evaluateSealedDraft";
import { closedBox } from "../core/closedBox";
import { checkClosedBox } from "../core/warnings";
import { useSealedDraft } from "../hooks/useSealedDraft";

const ClosedBox3D = lazy(() => import("../components/ClosedBox3D").then(module => ({ default: module.ClosedBox3D })));
const panel = "grid min-w-0 content-start gap-5 rounded-2xl border border-zinc-800/90 bg-zinc-900/65 p-5 sm:p-6";
const button = "rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-orange-400 focus-visible:outline-2 focus-visible:outline-orange-400";
const axisLabels = [["w", "Ширина"], ["h", "Высота"], ["d", "Глубина"]] as const;

export function ClosedBoxPage({ initialDraft }: { initialDraft?: SealedBoxDraft }) {
    const { draft, setDraft, field, storageError, restored } = useSealedDraft(initialDraft);
    const [undoDraft, setUndoDraft] = useState<SealedBoxDraft | null>(null);
    const [notice, setNotice] = useState("");
    const view = draft.view;
    const target = draft.responseBasis === "target";
    const model = useMemo(() => evaluateSealedDraft(draft), [draft]);
    const box = model.calculation?.dimensions ?? null;
    const result = model.calculation ? target ? closedBox(draft.ts, draft.vb, draft.ql) : model.calculation.response : null;
    const installation = model.installation;
    const errors = model.errors;
    const sourceDriver = SEALED_PRESETS[draft.presetKey];
    const driverName = `${sourceDriver.spec.brand} ${sourceDriver.spec.name}`;
    const setTs = (key: keyof DriverTS) => (value: number) => setDraft(previous => ({ ...previous, parametersEdited: true, ts: { ...previous.ts, [key]: value } }));
    const geometryReasons = [...(box?.reasons ?? []), ...(installation?.problems ?? [])];
    const warnings = result ? target ? checkClosedBox({ ts: draft.ts, vb: draft.vb, box: result, type: "subwoofer" }) : model.calculation?.warnings ?? [] : [];
    const cabinInvalid = Object.keys(errors).some(key => key.startsWith("cabin"));
    const chartCabin = cabinInvalid ? { ...draft.cabin, enabled: false } : draft.cabin;
    const openSettings = (nextView: SealedView = "2d", focusLabel?: string) => {
        setDraft(previous => ({ ...previous, view: nextView }));
        window.setTimeout(() => {
            const input = focusLabel ? document.querySelector<HTMLInputElement>(`input[aria-label="${focusLabel}"]`) : document.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
            const details = input?.closest("details");
            if (details) details.open = true;
            input?.focus();
        }, 0);
    };
    const editDisplacement = (value: number) => setDraft(previous => ({ ...previous, driverDisplacementL: Number.isNaN(value) ? null : value, displacementSource: "estimate" }));
    const acceptVolume = () => {
        if (!box || !model.netVolumeKnown) return;
        field("vb")(Math.round(box.volumeL * 100) / 100);
        setNotice("Целевой объём обновлён по расчётной геометрии. Остальные настройки сохранены.");
    };
    const choosePreset = (driver: typeof sourceDriver) => {
        setDraft(previous => selectDriverPreset(previous, driver === JL_REFERENCE_DRIVER ? "jl" : "edge"));
        setNotice("Параметры выбранного динамика загружены. Целевой объём и настройки корпуса сохранены.");
    };

    return <div className="mx-auto grid max-w-[1500px] gap-6 p-4 lg:p-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
            <div><h1 className="text-2xl font-semibold tracking-[-0.035em] text-zinc-100">Закрытый ящик</h1><p className="mt-1 text-sm leading-6 text-zinc-400">Динамик, акустика и конструкция в одном расчёте.</p></div>

            <a href="#sealed-results" className="min-h-11 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-orange-300 lg:hidden">К результату</a>
        </header>

        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <aside className="grid min-w-0 gap-4" aria-label="Параметры корпуса">
        <section className={panel} aria-label="Исходные данные ЗЯ">
            <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <PresetSelect value={draft.presetKey === "edge" ? "0" : "1"} onChange={choosePreset} />
                <FieldWithHint label="Целевой чистый объём Vb" unit="л" hint="Сколько воздуха должно остаться после вычета динамика, распорок и внутренних деталей. Это цель подбора; корпус может получить другой объём из-за ограничений размеров." value={draft.vb} error={errors.vb} onChange={field("vb")} step={0.5} />
                <label className="grid gap-2 text-sm font-medium text-zinc-300"><span className="flex items-center gap-2">Модель потерь<HintPopover label="Модель потерь" text="Ql10 — условное приближение дополнительных потерь, не измерение этого корпуса. Идеальная модель не добавляет потерь. Переключение влияет на расчёт; вид результата — нет." /></span><select aria-label="Модель потерь" value={draft.ql === Infinity ? "ideal" : "10"} onChange={event => field("ql")(event.target.value === "ideal" ? Infinity : 10)} className="min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-base text-zinc-100 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"><option value="10">Обычный корпус · Ql 10</option><option value="ideal">Без дополнительных потерь</option></select></label>
            </div>
            <>
                <div className="grid gap-3 border-t border-zinc-800 pt-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-1">
                    <FieldWithHint label="Fs" unit="Гц" hint="Резонанс динамика в свободном воздухе; значение из паспорта или измерения." value={draft.ts.fs} error={errors.fs} onChange={setTs("fs")} />
                    <FieldWithHint label="Qts" hint="Полная добротность динамика; используйте значение для вашей схемы подключения катушек." value={draft.ts.qts} error={errors.qts} step={0.01} onChange={setTs("qts")} />
                    <FieldWithHint label="Vas" unit="л" hint="Эквивалентный объём податливости подвеса динамика, не рекомендуемый объём корпуса." value={draft.ts.vas} error={errors.vas} onChange={setTs("vas")} />
                </div>

            </>
            {draft.parametersEdited && <p className="text-xs text-orange-300">{driverName} · параметры изменены вручную</p>}

        </section>

            <details className={panel} aria-label="Монтаж динамика"><summary className="cursor-pointer font-semibold text-zinc-200">Монтаж динамика</summary>
                <div><p className="mt-1 text-xs text-zinc-400">Диаметры, глубина и координаты в миллиметрах. Неизвестные размеры оставьте пустыми.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FieldWithHint label="Номинальный диаметр динамика" unit="дюймы" hint="Размер класса динамика. При неизвестной раме используется только как явно отмеченная оценка внешнего контура." value={draft.nominalDiameterInch ?? NaN} error={errors.nominal} step={0.1} onChange={value => field("nominalDiameterInch")(Number.isNaN(value) ? null : value)} />
                    <FieldWithHint label="Внешний диаметр рамы" unit="мм" hint="Точный наружный размер по чертежу динамика. Номинальные 15 дюймов не гарантируют раму 381 мм." value={draft.frameDiameterMm ?? NaN} error={errors.frame} onChange={value => field("frameDiameterMm")(Number.isNaN(value) ? null : value)} />
                    <FieldWithHint label="Диаметр выреза" unit="мм" hint="Диаметр отверстия по документации. Вырез должен помещаться между соседними стенками корпуса." value={draft.cutoutDiameterMm ?? NaN} error={errors.cutout} onChange={value => field("cutoutDiameterMm")(Number.isNaN(value) ? null : value)} />
                    <FieldWithHint label="Глубина установки" unit="мм" hint="От внешней поверхности передней панели до задней точки динамика. 0 означает неизвестную глубину, а не плоский динамик." value={draft.driverDepthMm} error={errors.depth} onChange={field("driverDepthMm")} />
                    <FieldWithHint label="Запас панели" unit="мм/сторону" hint="Дополнительное место от контура рамы до края панели. Начальные 30 мм — допущение компоновки; крепёж и прочность проверяйте отдельно." value={draft.frontClearanceMm} error={errors.frontClearance} onChange={field("frontClearanceMm")} />
                    <FieldWithHint label="Зазор за динамиком" unit="мм" hint="Место между задней точкой динамика и внутренней задней стенкой. Начальные 20 мм — запас компоновки, не подтверждение достаточной вентиляции: сверяйте её с паспортом." value={draft.rearClearanceMm} error={errors.rearClearance} onChange={field("rearClearanceMm")} />
                    <FieldWithHint label="Центр выреза X" unit="мм" hint="От левого внешнего края передней панели при взгляде снаружи." value={draft.driverCenterMm?.x ?? NaN} error={errors.centerX} onChange={x => field("driverCenterMm")(previous => ({ x, y: previous?.y ?? NaN }))} />
                    <FieldWithHint label="Центр выреза Y" unit="мм" hint="От верхнего внешнего края передней панели при взгляде снаружи." value={draft.driverCenterMm?.y ?? NaN} error={errors.centerY} onChange={y => field("driverCenterMm")(previous => ({ x: previous?.x ?? NaN, y }))} />
                    <button type="button" disabled={!box} onClick={() => { if (box) field("driverCenterMm")({ x: dimensionsMm(box.outerCm).w / 2, y: dimensionsMm(box.outerCm).h / 2 }); }} className={`${button} self-end py-3 disabled:opacity-40`}>Разместить по центру</button>
                </div>
            </details>

            <details className={panel} aria-label="Объём оборудования"><summary className="cursor-pointer font-semibold text-zinc-200">Что занимает место внутри</summary>
                <div><p className="mt-1 text-xs text-zinc-400">Эти вычеты превращают объём полости в полезный воздушный объём.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FieldWithHint label="Вытеснение динамика" unit="л" hint="Объём части динамика внутри корпуса по документации или вашей оценке. Пустое поле или 0 — вычет неизвестен. Не путайте его с Vas." value={draft.driverDisplacementL ?? NaN} error={errors.displacement} onChange={editDisplacement} step={0.1} />
                    <FieldWithHint label="Объём распорок и деталей" unit="л" hint="Суммарный объём распорок, усилений и других деталей, занимающих внутреннюю полость. 0 — дополнительные детали не учтены." value={draft.bracesDisplacementL} error={errors.braces} onChange={field("bracesDisplacementL")} step={0.1} />
                    <label className="grid content-start gap-1.5 text-sm text-zinc-400">Источник вытеснения<select aria-label="Источник вытеснения" value={draft.displacementSource} onChange={event => field("displacementSource")(event.target.value as "estimate" | "documented")} className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-200"><option value="estimate">Предварительная оценка</option><option value="documented">По документации динамика</option></select></label>
                </div>

            </details>

            <details className={panel} aria-label="Геометрия корпуса"><summary className="cursor-pointer font-semibold text-zinc-200">Корпус и ограничения размеров</summary>

                <label className="grid max-w-sm gap-1.5 text-sm text-zinc-400">Материал стенок<select aria-label="Материал стенок" value={draft.material} onChange={event => field("material")(event.target.value as MaterialKey)} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200">{Object.entries(MATERIALS).map(([key, material]) => <option key={key} value={key}>{material.label} · {material.thicknessMm} мм</option>)}</select></label>
                <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-300">
                    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-orange-500" checked={draft.customDims} onChange={event => setDraft(previous => ({ ...previous, customDims: event.target.checked, ...(event.target.checked && box ? { dimsMm: dimensionsMm(box.innerCm) } : {}) }))} />Задать внутренние размеры вручную</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-orange-500" checked={draft.limitsEnabled} onChange={event => field("limitsEnabled")(event.target.checked)} />Ограничить габариты багажника</label>
                </div>
                {draft.customDims && <div><p className="mb-3 text-xs text-zinc-400">Внутренние размеры. Расчёт округляет их до 1 мм; материалы и вычеты учитываются отдельно.</p><div className="grid gap-4 sm:grid-cols-2">{axisLabels.map(([key, label]) => <FieldWithHint key={key} label={`${label} внутри`} unit="мм" hint="Размер воздушной полости между внутренними поверхностями панелей; минимум 1 мм." value={draft.dimsMm[key]} error={errors[`dim${key}`]} onChange={value => field("dimsMm")(previous => ({ ...previous, [key]: value }))} />)}</div></div>}
                {draft.limitsEnabled && <div><p className="mb-3 text-xs text-zinc-400">Максимальный внешний габарит ниши, с учётом стенок.</p><div className="grid gap-4 sm:grid-cols-2">{axisLabels.map(([key, label]) => <FieldWithHint key={key} label={label} unit="мм" hint="Доступный внешний размер для корпуса." value={draft.limitsMm[key]} error={errors[`limit${key}`]} onChange={value => field("limitsMm")(previous => ({ ...previous, [key]: value }))} />)}</div></div>}
                <p className="text-xs text-zinc-400">Рама, крепёж и вентиляция должны быть проверены по документации. Номинальный диаметр и схема 3D не заменяют монтажный чертёж динамика.</p>
            </details>

            <details className={panel} aria-label="Настройка поправки салона"><summary className="cursor-pointer text-sm font-medium">Поправка салона · условная иллюстрация</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FieldWithHint label="Подъём салона" unit="дБ" hint="Высота условного колокола, не характеристика конкретного автомобиля." value={draft.cabin.boostDb} error={errors.cabinBoost} onChange={value => field("cabin")(previous => ({ ...previous, boostDb: value }))} />
                <FieldWithHint label="Центр подъёма" unit="Гц" hint="Частота максимальной поправки." value={draft.cabin.centerHz} error={errors.cabinCenter} onChange={value => field("cabin")(previous => ({ ...previous, centerHz: value }))} />
                <FieldWithHint label="Ширина подъёма" unit="октавы" hint="Ширина гладкого колокола по логарифмической частоте." value={draft.cabin.widthOct} error={errors.cabinWidth} step={0.1} onChange={value => field("cabin")(previous => ({ ...previous, widthOct: value }))} />
            </div><p className="mt-2 text-xs text-zinc-400">Поправка влияет на график, курсор и измерительные линии. Базовые fc, Qtc и f3 остаются без салона.</p></details>        </aside>
        <main id="sealed-results" className="scroll-mt-24 grid min-w-0 content-start gap-4 lg:sticky lg:top-24 lg:self-start">
        {(Object.keys(errors).length > 0 || model.error) && <section role="alert" className="grid gap-2 rounded-lg border-l-4 border-red-500 bg-zinc-900 p-3 text-sm text-red-300"><p className="font-medium">Проверьте настройки расчёта</p>{model.error && <p>{model.error}</p>}{Object.entries(errors).map(([key, message]) => <p key={key}>{message}</p>)}{(model.error || Object.keys(errors).some(key => key !== "vb")) && <button type="button" className={`${button} justify-self-start`} onClick={() => openSettings("chart")}>Открыть настройки</button>}</section>}


            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <label className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium">Основа графика
                    <select aria-label="Основа графика" value={draft.responseBasis} onChange={event => field("responseBasis")(event.target.value as "target" | "construction")} className="min-h-11 max-w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline-2 focus-visible:outline-orange-400">
                        <option value="target">Подбор объёма</option><option value="construction">По размерам корпуса</option>
                    </select>
                </label>
            </div>
            {result && <>
                <MetricsRow qtc={result.qtc} fc={result.fc} f3={result.f3} peakDb={result.peakDb} simple={false} />
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-3 py-3 sm:px-4">
                        <div role="group" className="flex flex-wrap gap-1 rounded-lg bg-zinc-950 p-1" aria-label="Вид расчёта">{([["chart", "График"], ["2d", "2D короб"], ["3d", "3D"], ["drawing", "Чертёж"]] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => field("view")(id)} className={`rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-orange-400 ${view === id ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"}`}>{label}</button>)}</div>
                        {view === "chart" && <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"><input className="size-4 accent-orange-500" type="checkbox" checked={draft.cabin.enabled} onChange={event => field("cabin")(previous => ({ ...previous, enabled: event.target.checked }))} />Учитывать салон автомобиля</label>}
                    </div>
                    {view === "chart" ? <div className="mx-auto max-w-3xl p-3"><ResponseChart fc={result.fc} qtc={result.qtc} cabin={chartCabin} /><p className="mt-2 text-xs text-zinc-400">{target ? `Прогноз для целевых ${draft.vb.toFixed(2)} л` : `По размерам корпуса: ${box?.volumeL.toFixed(2)} л`}. {target ? "Монтаж и габариты проверяются отдельно." : model.netVolumeKnown ? "Вычеты оборудования учтены." : "При неизвестном вытеснении результат предварительный."}</p><p className="mt-2 text-xs text-zinc-400">{chartCabin.enabled ? `Оранжевая — с поправкой; пунктир — без салона. Условный подъём ${chartCabin.boostDb} дБ при ${chartCabin.centerHz} Гц, ширина ${chartCabin.widthOct} октавы; не измерение автомобиля.` : "АЧХ без салона. Два клика — сравнение уровней, стрелки — перемещение линии, правый клик — сброс."}</p></div>
                        : box && installation ? view === "2d" ? <BoxSizePanel box={box} material={draft.material} installation={installation} volumeKnown={model.netVolumeKnown} driverDisplacementL={(draft.driverDisplacementL ?? 0) + draft.bracesDisplacementL} driverDepthMm={draft.driverDepthMm} />
                        : view === "drawing" ? <BoxDrawing box={box} material={draft.material} installation={installation} volumeKnown={model.netVolumeKnown} />
                        : <Suspense fallback={<p className="grid min-h-80 place-items-center text-sm text-zinc-400">Загружаю 3D-модель…</p>}><ClosedBox3D outerCm={box.outerCm} material={draft.material} installation={installation} magnetDiameterMm={draft.magnetDiameterMm} magnetDepthMm={draft.magnetDepthMm} /></Suspense>
                        : <p role="alert" className="p-6 text-sm text-amber-300">Задайте корректные координаты центра, чтобы показать монтажную схему.</p>}
                </div>
                {warnings.length > 0 && <WarningBar warnings={warnings} />}
                {geometryReasons.length > 0 && view !== "2d" && view !== "drawing" && <details aria-label="Ограничения конструкции" className="rounded-lg border border-amber-500/30 p-3 text-sm text-amber-200" open={geometryReasons.some(reason => !reason.startsWith("объём "))}><summary className="cursor-pointer">Ограничения конструкции · {geometryReasons.length}</summary><div className="mt-2 grid gap-1">{geometryReasons.map(reason => <p key={reason}>Габариты короба: {reason}</p>)}</div><button type="button" className={`${button} mt-3`} onClick={() => openSettings()}>Проверить конструкцию</button></details>}
            </>}
            <SealedVolumeBalance draft={draft} model={model} onExpert={() => openSettings("2d", !model.netVolumeKnown ? "Вытеснение динамика, л" : undefined)} onAccept={acceptVolume} />
        </main>

        </div>

        <footer className="grid gap-3 border-t border-zinc-800 pt-4 text-xs text-zinc-500 sm:flex sm:items-center sm:justify-between"><p>{storageError ? "Локальное сохранение недоступно в этом браузере. Настройки сохраняются до перезагрузки страницы." : restored ? "Черновик восстановлен. Изменения сохраняются в этом браузере." : "Настройки ЗЯ автоматически сохраняются в этом браузере."}</p><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => { setUndoDraft(draft); setDraft({ ...createSealedDraft(), mode: draft.mode }); setNotice("Начат новый расчёт. Предыдущий можно вернуть кнопкой отмены."); }}>Новый расчёт</button>{undoDraft && <button type="button" className={button} onClick={() => { setDraft(undoDraft); setUndoDraft(null); setNotice("Предыдущий расчёт восстановлен."); }}>Вернуть предыдущий</button>}</div></footer>
        <p role="status" className="text-xs text-zinc-400">{notice}</p>
    </div>;
}
