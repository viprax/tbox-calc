import { useMemo, useState } from "react";
import { closedBox } from "../core/closedBox";
import { checkClosedBox } from "../core/warnings";
import { solveBoxDimensions } from "../core/boxDimensions";
import type { DriverTS } from "../core/types";
import { FieldWithHint } from "../components/FieldWithHint";
import { ResponseChart } from "../components/ResponseChart";
import { MetricsRow } from "../components/MetricsRow";
import { WarningBar } from "../components/WarningBar";
import { CABIN_GAIN_DEFAULT, type CabinGain } from "../core/cabinGain.ts";

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

function fieldError(name: string, v: number): string | null {
    if (!Number.isFinite(v)) return `${name}: введи число`;
    if (v <= 0) return `${name}: значение должно быть больше нуля`;
    return null;
}

export function ClosedBoxPage() {
    const [ts, setTs] = useState<DriverTS>(EXAMPLE);
    const [vb, setVb] = useState(20);
    const [cabin, setCabin] = useState<CabinGain>(CABIN_GAIN_DEFAULT);

    const errors = {
        fs: fieldError("Fs", ts.fs),
        qts: fieldError("Qts", ts.qts),
        vas: fieldError("Vas", ts.vas),
        vb: fieldError("Vb", vb),
    };
    const valid = Object.values(errors).every((e) => e === null);

    const result = useMemo(() => (valid ? closedBox(ts, vb) : null), [valid, ts, vb]);
    const warnings = useMemo(
        () => (result ? checkClosedBox({ ts, vb, box: result, type: "subwoofer" }) : []),
        [result, ts, vb],
    );
    const box = useMemo(
        () => (valid ? solveBoxDimensions({ vbNetL: vb, material: "plywood" }) : null),
        [valid, vb],
    );

    const set = (key: keyof DriverTS) => (v: number) => setTs((prev) => ({ ...prev, [key]: v }));

    return (
        <div className="grid gap-4 p-4 lg:grid-cols-[260px_1fr_260px]">
            <aside className={panel}>
                <h2 className="text-sm font-semibold text-zinc-300">Параметры динамика</h2>
                <FieldWithHint label="Fs" unit="Гц" hint="Резонанс динамика в свободном воздухе. Из даташита." value={ts.fs} error={errors.fs} onChange={set("fs")} />
                <FieldWithHint label="Qts" hint="Полная добротность. Обычно 0.2-0.8." value={ts.qts} step={0.01} error={errors.qts} onChange={set("qts")} />
                <FieldWithHint label="Vas" unit="л" hint="Эквивалентный объём подвеса. Из даташита." value={ts.vas} error={errors.vas} onChange={set("vas")} />
                <FieldWithHint label="Vb (нетто)" unit="л" hint="Внутренний объём ящика за вычетом динамика." value={vb} error={errors.vb} onChange={setVb} />
            </aside>

            <main className="grid content-start gap-4">
                {result ? (
                    <>
                        <MetricsRow qtc={result.qtc} fc={result.fc} f3={result.f3} peakDb={result.peakDb} />
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={cabin.enabled}
                                    onChange={(e) => setCabin((c) => ({ ...c, enabled: e.target.checked }))}
                                />
                                Салон автомобиля (cabin gain, условно)
                            </label>
                            <ResponseChart fc={result.fc} qtc={result.qtc} f3={result.f3} cabin={cabin} />
                        </div>
                        <WarningBar warnings={warnings} />
                    </>
                ) : (
                    <p className="text-zinc-400">Заполни все поля положительными числами.</p>
                )}
            </main>

            <aside className={panel}>
                <h2 className="text-sm font-semibold text-zinc-300">Размеры короба</h2>
                {box && (
                    <div className="grid gap-1 text-sm">
                        <p>Внутри: {box.innerCm.w * 10} × {box.innerCm.h * 10} × {box.innerCm.d * 10} мм</p>
                        <p>Снаружи: {box.outerCm.w * 10} × {box.outerCm.h * 10} × {box.outerCm.d * 10} мм</p>
                        <p>Объём: {box.volumeL.toFixed(2)} л</p>
                        {box.reasons.map((r) => (
                            <p key={r} className="text-red-400">{r}</p>
                        ))}
                    </div>
                )}
            </aside>
        </div>
    );
}