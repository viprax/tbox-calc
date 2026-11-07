import { sampleResponse } from "../core/closedBox";

const W = 640, H = 320;
const PAD = { l: 44, r: 12, t: 12, b: 28 };
const F_MIN = 10, F_MAX = 300, DB_MIN = -24, DB_MAX = 6;
const X_TICKS = [10, 20, 30, 50, 100, 200];
const Y_TICKS = [6, 0, -6, -12, -18, -24];

const xOf = (f: number) =>
    PAD.l + ((Math.log(f) - Math.log(F_MIN)) / (Math.log(F_MAX) - Math.log(F_MIN))) * (W - PAD.l - PAD.r);
const yOf = (db: number) =>
    PAD.t + ((DB_MAX - Math.max(DB_MIN, Math.min(DB_MAX, db))) / (DB_MAX - DB_MIN)) * (H - PAD.t - PAD.b);

interface Props {
    fc: number;
    qtc: number;
    f3: number;
}

export function ResponseChart({ fc, qtc, f3 }: Props) {
    const pts = sampleResponse(fc, qtc, F_MIN, F_MAX, 200);
    const d = pts
        .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.f).toFixed(1)},${yOf(p.db).toFixed(1)}`)
        .join(" ");

    return (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="АЧХ закрытого ящика" className="h-auto w-full">
            {Y_TICKS.map((db) => (
                <g key={db}>
                    <line
                        x1={PAD.l} x2={W - PAD.r} y1={yOf(db)} y2={yOf(db)}
                        className={db === 0 ? "stroke-zinc-400/60" : "stroke-zinc-700"}
                    />
                    <text x={PAD.l - 6} y={yOf(db) + 4} textAnchor="end" className="fill-zinc-400 text-[11px]">
                        {db}
                    </text>
                </g>
            ))}
            {X_TICKS.map((f) => (
                <g key={f}>
                    <line x1={xOf(f)} x2={xOf(f)} y1={PAD.t} y2={H - PAD.b} className="stroke-zinc-700" />
                    <text x={xOf(f)} y={H - 8} textAnchor="middle" className="fill-zinc-400 text-[11px]">
                        {f}
                    </text>
                </g>
            ))}
            <line
                x1={PAD.l} x2={W - PAD.r} y1={yOf(-3)} y2={yOf(-3)}
                className="stroke-zinc-400/60 [stroke-dasharray:4_4]"
            />
            <path d={d} fill="none" className="stroke-orange-400 stroke-[2.5]" />
            <circle cx={xOf(f3)} cy={yOf(-3)} r={4} className="fill-orange-400" />
        </svg>
    );
}