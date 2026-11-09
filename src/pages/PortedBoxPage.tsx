import { useMemo, useState } from "react";
import { checkPort, lvForTuning, portedBox, type PortGeometry } from "../core/portedBox";
import type { DriverTS } from "../core/types";
import type { BoxWarning } from "../core/warnings";
import { FieldWithHint } from "../components/FieldWithHint";
import { WarningBar } from "../components/WarningBar";

const panel = "grid content-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3";

/** Динамик Edge EDS15D1-E7. Sd и Xmax - условные, помечены в интерфейсе. */
const EXAMPLE_TS: DriverTS = {
    fs: 32.3, qts: 0.28, vas: 50.8, sd: 750, xmax: 20, // Xmax условно
    qms: 3.55, qes: 0.304, re: 2, le: 0, bl: 22.4, mms: 380,
};

function fieldError(name: string, v: number): string | null {
    if (!Number.isFinite(v)) return `${name}: введи число`;
    if (v <= 0) return `${name}: значение должно быть больше нуля`;
    return null;
}

export function PortedBoxPage() {
    const [ts] = useState<DriverTS>(EXAMPLE_TS);
    const [vb, setVb] = useState(190);
    const [spCm2, setSpCm2] = useState(500);
    const [lvCm, setLvCm] = useState(50);
    const [targetFb, setTargetFb] = useState(32);

    const errors = {
        vb: fieldError("Vb", vb),
        sp: fieldError("Сечение порта", spCm2),
        lv: fieldError("Длина порта", lvCm),
        fb: fieldError("Целевая Fb", targetFb),
    };
    const valid = Object.values(errors).every((e) => e === null);

    const geom: PortGeometry | null = valid ? { spCm2, lvCm } : null;

    const result = useMemo(
        () => (geom ? portedBox(vb, geom, ts.sd, ts.xmax) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [vb, spCm2, lvCm, valid, ts.sd, ts.xmax],
    );

    const warnings: BoxWarning[] = useMemo(
        () => (result && geom ? checkPort(result, geom) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [result, spCm2, lvCm],
    );

    const lvForFb = useMemo(
        () => (valid ? lvForTuning(vb, spCm2, targetFb) : null),
        [valid, vb, spCm2, targetFb],
    );

    return (
        <div className="grid gap-4 p-4 lg:grid-cols-[260px_1fr_260px]">
            <aside className={panel}>
                <h2 className="text-sm font-semibold text-zinc-300">Ящик и порт</h2>
                <FieldWithHint label="Vb (нетто)" unit="л" hint="Внутренний объём ящика за вычетом динамика и порта." value={vb} error={errors.vb} onChange={setVb} />
                <FieldWithHint label="Сечение порта Sp" unit="см²" hint="Площадь сечения трубы. Круглый порт: π·r²." value={spCm2} error={errors.sp} onChange={setSpCm2} />
                <FieldWithHint label="Длина порта Lv" unit="см" hint="Геометрическая длина трубы, без поправки на концы." value={lvCm} error={errors.lv} onChange={setLvCm} />
                <FieldWithHint label="Целевая Fb" unit="Гц" hint="Подбор длины трубы под эту частоту настройки." value={targetFb} error={errors.fb} onChange={setTargetFb} />
            </aside>

            <main className="grid content-start gap-4">
                {result ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 sm:grid-cols-4">
                            {[
                                { label: "Fb", value: `${result.fbHz.toFixed(1)} Гц` },
                                { label: "Leff", value: `${result.leffCm.toFixed(1)} см` },
                                { label: "Радиус", value: `${result.rCm.toFixed(2)} см` },
                                { label: "Скорость", value: `${result.peakVelocityMs.toFixed(1)} м/с` },
                            ].map((m) => (
                                <div key={m.label}>
                                    <span className="block text-xs text-zinc-400">{m.label}</span>
                                    <b className="text-xl font-semibold">{m.value}</b>
                                </div>
                            ))}
                        </div>
                        <WarningBar warnings={warnings} />
                    </>
                ) : (
                    <p className="text-zinc-400">Заполни все поля положительными числами.</p>
                )}
            </main>

            <aside className={panel}>
                <h2 className="text-sm font-semibold text-zinc-300">Подбор длины</h2>
                <p className="text-xs text-zinc-400">Xmax {ts.xmax} мм (условно)</p>
                {valid && lvForFb !== null && (
                    <p className="text-sm">
                        Для Fb {targetFb} Гц при Sp {spCm2} см² нужна длина {lvForFb.toFixed(1)} см
                    </p>
                )}
                {valid && lvForFb === null && (
                    <p className="text-sm text-red-400">Для такой Fb труба не подходит: длина выходит отрицательной</p>
                )}
            </aside>
        </div>
    );
}