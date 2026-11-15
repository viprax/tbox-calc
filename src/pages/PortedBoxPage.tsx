import { useMemo, useState } from "react";
import { checkPort, lvForTuning, portedBox, tuningHz } from "../core/portedBox";
import { CABIN_GAIN_DEFAULT } from "../core/cabinGain";
import { portedF3Hz } from "../core/portedResponse";
import type { DriverTS } from "../core/types";
import { PresetSelect } from "../components/PresetSelect";
import { DEFAULT_DRIVER } from "../data/drivers";
import { FieldWithHint } from "../components/FieldWithHint";
import { WarningBar } from "../components/WarningBar";
import { PortedCompareChart } from "../components/PortedCompareCharts";

const panel = "grid min-w-0 self-start content-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3";

function fieldError(name: string, v: number): string | null {
    if (!Number.isFinite(v)) return `${name}: введи число`;
    if (v <= 0) return `${name}: значение должно быть больше нуля`;
    return null;
}

export function PortedBoxPage() {
    const [cabin, setCabin] = useState(CABIN_GAIN_DEFAULT);
    const [ts, setTs] = useState<DriverTS>(DEFAULT_DRIVER.ts);
    const [driverName, setDriverName] = useState("EDGE EDS15D1-E7");
    const [vb, setVb] = useState(190);
    const [spCm2, setSpCm2] = useState(491);
    const [lvCm, setLvCm] = useState(67.5);
    const [targetFb, setTargetFb] = useState(30);
    const [tuningInput, setTuningInput] = useState<"length" | "frequency">("length");
    const [ql, setQl] = useState(10);
    const [portModel, setPortModel] = useState<"physical" | "speakershop">("speakershop");

    const errors = {
        vb: fieldError("Vb", vb),
        sp: fieldError("Сечение порта", spCm2),
        lv: tuningInput === "length" ? fieldError("Длина порта", lvCm) : null,
        fb: fieldError("Целевая Fb", targetFb),
        ql: fieldError("Ql", ql),
    };
    const valid = Object.values(errors).every((e) => e === null);

    const calculation = useMemo(() => {
        if (!valid) return { result: null, length: null, warnings: [], error: null };
        try {
            const length = lvForTuning(vb, spCm2, targetFb, portModel === "speakershop" ? 2 : 1.46, portModel === "speakershop" ? 35667 : 34300);
            if (tuningInput === "frequency" && length === null) return { result: null, length: null, warnings: [], error: "Для такой Fb труба не подходит: нужна нулевая или отрицательная длина. Уменьшите частоту или измените объём и сечение порта." };
            const geom = { spCm2, lvCm: tuningInput === "frequency" && length !== null ? length : lvCm, model: portModel };
            const result = portedBox(vb, geom);
            if (![result.fbHz, result.leffCm, result.rCm].every(Number.isFinite) || (length !== null && !Number.isFinite(length))) throw new Error("Параметры выходят за численный диапазон расчёта");
            return { result, length, warnings: checkPort(result, geom), error: null };
        } catch (error) {
            return { result: null, length: null, warnings: [], error: error instanceof Error ? error.message : "Ошибка расчёта" };
        }
    }, [valid, vb, spCm2, lvCm, targetFb, portModel, tuningInput]);
    const { result, warnings, length: lvForFb } = calculation;
    const geometryLength = tuningInput === "frequency" ? lvForFb ?? NaN : lvCm;

    const editLength = (length: number) => {
        setLvCm(length);
        setTuningInput("length");
        if ([vb, spCm2, length].every(value => Number.isFinite(value) && value > 0)) {
            try { setTargetFb(tuningHz(vb, { spCm2, lvCm: length, model: portModel })); }
            catch { /* The calculation reports invalid or overflowing geometry. */ }
        }
    };

    const params = result ? {
        fs: ts.fs,
        qts: ts.qts,
        vas: ts.vas,
        vb,
        fb: result.fbHz,
        ql,
    } : null;
    const f3Hz = params ? portedF3Hz(params) : null;
    const masterSetupSelected = Math.abs(vb - 130) < 0.01
        && Math.abs(spCm2 - Math.PI * 9.5 ** 2) < 0.01
        && Math.abs(geometryLength - 59.09) < 0.01
        && Math.abs(targetFb - 30) < 0.01
        && Math.abs(ql - 7) < 0.01;
    const physicalMasterSetupSelected = Math.abs(vb - 130) < 0.01
        && Math.abs(spCm2 - Math.PI * 10 ** 2) < 0.01
        && Math.abs(geometryLength - 50) < 0.01
        && Math.abs(targetFb - 30) < 0.01
        && Math.abs(ql - 7) < 0.01;
    const chooseReference = (referenceVb: number, referenceFb: number, portDiameterCm: number, referenceLength: number, referenceQl = 10, referenceModel: "physical" | "speakershop" = "speakershop") => {
        setPortModel(referenceModel);
        setTuningInput("length");
        setVb(referenceVb);
        setTargetFb(referenceFb);
        setSpCm2(Number((Math.PI * (portDiameterCm / 2) ** 2).toFixed(2)));
        setLvCm(referenceLength);
        setQl(referenceQl);
    };

    return (
        <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:p-6">
            <aside className={panel}>
                <h2 className="text-sm font-semibold text-zinc-300">Ящик и порт</h2>
                <p className="text-xs text-zinc-400">{driverName}</p>
                <PresetSelect onChange={(driver) => { setTs(driver.ts); setDriverName(`${driver.spec.brand} ${driver.spec.name}`); }} />
                <label className="grid gap-1 text-xs text-zinc-400">Геометрическая модель порта
                    <select className="w-full min-w-0 max-w-full rounded border border-zinc-700 bg-zinc-950 p-2" aria-label="Геометрическая модель порта" value={portModel} onChange={(event) => setPortModel(event.target.value as "physical" | "speakershop")} >
                        <option value="speakershop">SpeakerShop 1.0 · сохранённые эталоны</option>
                        <option value="physical">Прямой круглый порт · 343 м/с, 1.46r</option>
                    </select>
                </label>
                <p className="text-xs text-zinc-400">Профиль раструбов не моделируется. В режиме SpeakerShop используются отдельные коэффициенты совместимости: это не измеренная скорость звука.</p>
                <details className="min-w-0 rounded-lg border border-zinc-800 p-3">
                <summary className="cursor-pointer text-xs text-zinc-400">Сохранённые варианты мастера</summary>
                <div className="mt-3 grid min-w-0 gap-2">
                    <button
                        type="button"
                        onClick={() => chooseReference(190, 30, 25, 67.5)}
                        className="rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"
                    >
                        JBL · 190 л / 30 Гц
                    </button>
                    <button
                        type="button"
                        onClick={() => chooseReference(80, 40, 25, 98.57)}
                        className="rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"
                    >
                        JBL · 80 л / 40 Гц
                    </button>
                    <button
                        type="button"
                        onClick={() => chooseReference(130, 30, 19, 59.09, 7)}
                        className="rounded border border-orange-500/50 bg-orange-500/5 px-2 py-1.5 text-xs text-orange-100 hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"
                    >
                        Мастер · 1 динамик / 130 л / 30 Гц
                    </button>
                    <button
                        type="button"
                        onClick={() => chooseReference(130, 30, 20, 50, 7, "physical")}
                        className="rounded border border-sky-700/60 bg-sky-950/20 px-2 py-1.5 text-xs text-sky-100 hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                    >
                        Физический порт мастера · Ø200 × 500 мм
                    </button>
                </div>
                </details>
                <FieldWithHint
                    label="Vb (нетто)"
                    unit="л"
                    hint="Внутренний объём ящика за вычетом динамика и порта."
                    value={vb}
                    error={errors.vb}
                    onChange={setVb}
                />
                <FieldWithHint
                    label="Сечение порта Sp"
                    unit="см²"
                    hint="Площадь сечения трубы. Круглый порт: π·r²."
                    value={spCm2}
                    error={errors.sp}
                    step={0.01}
                    onChange={setSpCm2}
                />
                <FieldWithHint
                    label="Длина порта Lv"
                    unit="см"
                    hint="Геометрическая длина трубы, без поправки на концы."
                    value={geometryLength}
                    error={errors.lv}
                    onChange={editLength}
                />
                <FieldWithHint
                    label="Целевая Fb"
                    unit="Гц"
                    hint="Изменение частоты автоматически подбирает длину порта и обновляет график. Объём и сечение остаются заданными вами."
                    value={targetFb}
                    error={errors.fb}
                    onChange={value => { setTargetFb(value); setTuningInput("frequency"); }}
                />
                <p className="text-xs leading-relaxed text-zinc-400">{tuningInput === "frequency" ? "Подбираем длину под Fb. При изменении объёма или сечения частота сохраняется, длина пересчитывается." : "Считаем Fb по длине порта. Измените целевую Fb, чтобы подобрать новую длину и обновить график."}</p>
                <FieldWithHint
                    label="Ql"
                    hint="Добротность потерь ящика. Влияет на форму АЧХ и F3, но не на Fb, рассчитанную по объёму и порту."
                    value={ql}
                    error={errors.ql}
                    step={0.1}
                    onChange={setQl}
                />
            </aside>

            <main className="grid min-w-0 content-start gap-4">
                {result ? (
                    <>
                        <div className="grid min-w-0 grid-cols-2 gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:grid-cols-3 xl:grid-cols-5">
                            {[
                                { label: "Fb", value: `${result.fbHz.toFixed(1)} Гц` },
                                { label: "F3", value: f3Hz === null ? "—" : `${f3Hz.toFixed(2)} Гц` },
                                { label: "Leff", value: `${result.leffCm.toFixed(1)} см` },
                                { label: "Радиус", value: `${result.rCm.toFixed(2)} см` },
                                { label: "Скорость", value: result.peakVelocityMs === null ? "Недостаточно данных" : `${result.peakVelocityMs.toFixed(1)} м/с` },
                            ].map((m) => (
                                <div key={m.label}>
                                    <span className="block text-xs text-zinc-400">{m.label}</span>
                                    <b className="block break-words text-lg font-semibold xl:text-xl">{m.value}</b>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-400">
                            Целевая Fb {targetFb.toFixed(1)} Гц; по геометрии порта получается {result.fbHz.toFixed(2)} Гц.
                            F3 — нижнее пересечение −3 дБ.
                        </p>
                        {masterSetupSelected && <p className="rounded border border-sky-900/70 bg-sky-950/30 p-2 text-xs leading-relaxed text-sky-200">
                            Программный вариант мастера: Dv 19 см, Lv 59,09 см, Ql 7. По сообщению пользователя, физическая реализация — труба Ø200 × 500 мм с раструбами; после сборки мастер получил Fb 30 Гц и F3 27,5 Гц. Текущая геометрическая модель не рассчитывает профиль этих раструбов.
                        </p>}
                        {physicalMasterSetupSelected && <p className="rounded border border-sky-900/70 bg-sky-950/30 p-2 text-xs leading-relaxed text-sky-200">
                            Контрольный физический вариант мастера: Ø200 × 500 мм вместе с раструбами; сообщённый результат после сборки — Fb 30 Гц / F3 27,5 Гц. Здесь труба пока считается прямой: Fb {result.fbHz.toFixed(2)} Гц. Разница показывает вклад неописанного профиля раструбов; Ql на Fb не влияет.
                        </p>}
                        <WarningBar warnings={warnings} />
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                            <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                                <input type="checkbox" className="size-4 accent-orange-500" checked={cabin.enabled} onChange={(event) => setCabin((current) => ({ ...current, enabled: event.target.checked }))} />
                                Учитывать салон автомобиля
                            </label>
                            <p className="mb-2 text-xs text-zinc-500">Условная поправка +3 дБ на 60 Гц; меняет график и показания курсора. Fb и F3 рассчитаны без салона.</p>
                            {params && <PortedCompareChart params={params} cabin={cabin} />}
                        </div>
                    </>
                ) : (
                    <p role="alert" className="text-zinc-400">{calculation.error ?? "Заполни все поля положительными числами."}</p>
                )}
            </main>

            <aside className={`${panel} lg:col-start-2`}>
                <h2 className="text-sm font-semibold text-zinc-300">Подбор длины</h2>
                <p className="text-xs text-zinc-400">Объём трубы и запас внутреннего объёма</p>
                <div className="grid gap-1 border-t border-zinc-800 pt-3 text-sm">
                    <p>Объём трубы Sp × Lv: {(result ? spCm2 * geometryLength / 1000 : undefined)?.toFixed(2) ?? "—"} л</p>
                    <p>Короб изнутри: не меньше {(result ? vb + spCm2 * geometryLength / 1000 : undefined)?.toFixed(2) ?? "—"} л без динамика и распорок</p>
                </div>
                {valid && lvForFb !== null && (
                    <p className="text-sm">
                        Для Fb {targetFb} Гц при Sp {spCm2.toFixed(2)} см² нужна длина {lvForFb.toFixed(2)} см
                    </p>
                )}
                {valid && lvForFb === null && (
                    <p className="text-sm text-red-400">
                        Для такой Fb труба не подходит: длина выходит отрицательной
                    </p>
                )}
            </aside>
        </div>
    );
}
