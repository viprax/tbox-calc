import { useMemo, useState } from "react";
import { portedResponseDb, type PortedParams } from "../core/portedResponse";

const W = 640, H = 320;
const PAD = { l: 44, r: 12, t: 12, b: 28 };
const F_MIN = 10, F_MAX = 300, DB_MIN = -40, DB_MAX = 6;
const X_TICKS = [10, 20, 30, 50, 100, 200];
const Y_TICKS = [6, 0, -6, -12, -18, -24, -30, -36];

const xOf = (f: number) =>
    PAD.l + ((Math.log(f) - Math.log(F_MIN)) / (Math.log(F_MAX) - Math.log(F_MIN))) * (W - PAD.l - PAD.r);
const yOf = (db: number) =>
    PAD.t + ((DB_MAX - Math.max(DB_MIN, Math.min(DB_MAX, db))) / (DB_MAX - DB_MIN)) * (H - PAD.t - PAD.b);

/** Разбор текста из программы: строки вида "частота уровень", например "20 -18.5". */
export function parseReference(text: string): { f: number; db: number }[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim().replace(",", "."))
        .filter((line) => line.length > 0)
        .map((line) => line.split(/\s+/).map(Number))
        .filter(([f, db]) => Number.isFinite(f) && Number.isFinite(db) && f > 0)
        .sort((a, b) => a[0] - b[0])
        .map(([f, db]) => ({ f, db }));
}

interface Props {
    params: PortedParams;
}

export function PortedCompareChart({ params }: Props) {
    const [text, setText] = useState("");
    const ref = useMemo(() => parseReference(text), [text]);

    const ours = useMemo(() => {
        const pts: { f: number; db: number }[] = [];
        const lo = Math.log(F_MIN), hi = Math.log(F_MAX);
        for (let i = 0; i < 300; i++) {
            const f = Math.exp(lo + ((hi - lo) * i) / 299);
            pts.push({ f, db: portedResponseDb(f, params) });
        }
        return pts;
    }, [params]);

    const toPath = (pts: { f: number; db: number }[]) =>
        pts.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.f).toFixed(1)},${yOf(p.db).toFixed(1)}`).join(" ");

    return (
        <div className="grid gap-3">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Вставь точки из SpeakerShop: частота и уровень через пробел\n20 -18.5\n33 -3.1\n60 -0.4"}
                rows={5}
                className="rounded border border-zinc-700 bg-zinc-950 p-2 font-mono text-xs"
            />
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Сравнение АЧХ фазоинвертора" className="h-auto w-full">
                {Y_TICKS.map((db) => (
                    <g key={db}>
                        <line x1={PAD.l} x2={W - PAD.r} y1={yOf(db)} y2={yOf(db)} className="stroke-zinc-700" />
                        <text x={PAD.l - 6} y={yOf(db) + 4} textAnchor="end" className="fill-zinc-400 text-[11px]">{db}</text>
                    </g>
                ))}
                {X_TICKS.map((f) => (
                    <g key={f}>
                        <line x1={xOf(f)} x2={xOf(f)} y1={PAD.t} y2={H - PAD.b} className="stroke-zinc-700" />
                        <text x={xOf(f)} y={H - 8} textAnchor="middle" className="fill-zinc-400 text-[11px]">{f}</text>
                    </g>
                ))}
                <path d={toPath(ours)} fill="none" className="stroke-orange-400 stroke-[2.5]" />
                {ref.length > 1 && (
                    <path d={toPath(ref)} fill="none" className="stroke-sky-400 stroke-[2]" strokeDasharray="6 4" />
                )}
            </svg>
            <p className="text-xs text-zinc-400">
                Оранжевая — наш расчёт (не сверен), голубая пунктирная — точки из программы.
            </p>
        </div>
    );
}