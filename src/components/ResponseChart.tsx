import { useMemo, useState, type MouseEvent } from "react";
import { dbScale } from "../core/chartScale";
import { sampleResponse } from "../core/closedBox";
import { CABIN_GAIN_DEFAULT, type CabinGain } from "../core/cabinGain";
import { F_MAX_HZ, F_MIN_HZ, findPeak, freqFromX, levelAt, shiftFreq } from "../core/response";

const W = 640, H = 320;
const PAD = { l: 44, r: 12, t: 12, b: 28 };
const X_TICKS = [10, 20, 30, 50, 100, 200];

const xOf = (f: number) =>
    PAD.l + ((Math.log(f) - Math.log(F_MIN_HZ)) / (Math.log(F_MAX_HZ) - Math.log(F_MIN_HZ))) * (W - PAD.l - PAD.r);


interface Props {
    fc: number;
    qtc: number;
    cabin?: CabinGain;
}

type Line = { f: number };

export function ResponseChart({ fc, qtc, cabin = CABIN_GAIN_DEFAULT }: Props) {
    const [hover, setHover] = useState<number | null>(null);
    const [{ lines, activeLine }, setMeasurement] = useState<{ lines: Line[]; activeLine: number | null }>({ lines: [], activeLine: null });

    const pts = useMemo(() => sampleResponse(fc, qtc, F_MIN_HZ, F_MAX_HZ, 200), [fc, qtc]);
    const levels = useMemo(() => pts.map((p) => ({ f: p.f, db: levelAt(p.f, fc, qtc, cabin) })), [pts, fc, qtc, cabin]);
    const axis = useMemo(() => dbScale([...levels.map((p) => p.db), ...(cabin.enabled ? pts.map(p => p.db) : [])]), [levels, pts, cabin.enabled]);
    const yOf = (db: number) => PAD.t + (axis.max - db) / (axis.max - axis.min) * (H - PAD.t - PAD.b);
    const d = levels.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.f).toFixed(1)},${yOf(p.db).toFixed(1)}`).join(" ");

    const peak = useMemo(
        () => findPeak(fc, qtc, cabin.enabled ? cabin : undefined),
        [fc, qtc, cabin],
    );

    const svgX = (e: MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return ((e.clientX - rect.left) / rect.width) * W;
    };

    const toFreq = (x: number) => freqFromX(Math.min(W - PAD.r, Math.max(PAD.l, x)), PAD.l, W - PAD.r);

    const onMove = (e: MouseEvent<SVGSVGElement>) => setHover(toFreq(svgX(e)));

    const onClick = (e: MouseEvent<SVGSVGElement>) => {
        if (e.button !== 0) return;
        const f = toFreq(svgX(e));
        setMeasurement((previous) => ({
            lines: previous.lines.length < 2 ? [...previous.lines, { f }] : [{ f }, previous.lines[1]],
            activeLine: previous.lines.length < 2 ? previous.lines.length : 0,
        }));
    };

    const onContext = (e: MouseEvent<SVGSVGElement>) => {
        e.preventDefault();
        setMeasurement({ lines: [], activeLine: null });
    };

    const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
        const base = activeLine === null ? hover ?? fc : lines[activeLine].f;
        let next: number | null = null;
        if (e.key === "ArrowRight") next = shiftFreq(base, 1);
        if (e.key === "ArrowLeft") next = shiftFreq(base, -1);
        if (next !== null) {
            e.preventDefault();
            setMeasurement(previous => previous.activeLine === null ? previous : { ...previous, lines: previous.lines.map((line, index) => index === previous.activeLine ? { f: next } : line) });
            setHover(next);
        }
    };

    const cursorF = hover;
    const cursorDb = cursorF !== null ? levelAt(cursorF, fc, qtc, cabin) : null;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            tabIndex={0}
            aria-label="АЧХ закрытого ящика"
            className="h-auto w-full outline-none focus:ring-1 focus:ring-orange-400"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onClick={onClick}
            onContextMenu={onContext}
            onKeyDown={onKey}
        >
            <desc>Частота в герцах по горизонтали, относительный уровень в децибелах по вертикали.</desc>
            <text x="6" y="24" className="fill-zinc-400 text-[10px]">дБ</text>
            <text x={W - PAD.r} y={H - 8} textAnchor="end" className="fill-zinc-400 text-[10px]">Гц</text>
            {axis.ticks.map((db) => (
                <g key={db}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={yOf(db)} y2={yOf(db)}
                          className={db === 0 ? "stroke-zinc-400/60" : "stroke-zinc-700"} />
                    <text x={PAD.l - 6} y={yOf(db) + 4} textAnchor="end" className="fill-zinc-400 text-[11px]">{db}</text>
                </g>
            ))}
            {X_TICKS.map((f) => (
                <g key={f}>
                    <line x1={xOf(f)} x2={xOf(f)} y1={PAD.t} y2={H - PAD.b} className="stroke-zinc-700" />
                    <text x={xOf(f)} y={H - 8} textAnchor="middle" className="fill-zinc-400 text-[11px]">{f}</text>
                </g>
            ))}

            <line x1={PAD.l} x2={W - PAD.r} y1={yOf(-3)} y2={yOf(-3)} className="stroke-zinc-400/60 [stroke-dasharray:4_4]" />
            {cabin.enabled && <path data-curve="base" d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.f).toFixed(1)},${yOf(p.db).toFixed(1)}`).join(" ")} fill="none" className="stroke-zinc-400 stroke-[1.5] [stroke-dasharray:5_4]" />}
            <path data-curve={cabin.enabled ? "cabin" : "base"} d={d} fill="none" className="stroke-orange-400 stroke-[2.5]" />

            {peak && (
                <g>
                    <circle cx={xOf(peak.f)} cy={yOf(peak.db)} r={4} className="fill-orange-400" />
                    <text x={xOf(peak.f)} y={yOf(peak.db) - 8} textAnchor="middle" className="fill-orange-300 text-[11px]">
                        пик {peak.db.toFixed(1)} дБ
                    </text>
                </g>
            )}

            {cursorF !== null && cursorDb !== null && (
                <g>
                    <line x1={xOf(cursorF)} x2={xOf(cursorF)} y1={PAD.t} y2={H - PAD.b} className="stroke-zinc-300/50" />
                    <text x={xOf(cursorF) + 4} y={PAD.t + 12} className="fill-zinc-200 text-[11px]">
                        {cursorF.toFixed(1)} Гц, {cursorDb.toFixed(1)} дБ
                    </text>
                </g>
            )}

            {lines.map((l, i) => (
                <line key={i} x1={xOf(l.f)} x2={xOf(l.f)} y1={PAD.t} y2={H - PAD.b} className="stroke-sky-400 stroke-[1.5]" />
            ))}

            {lines.length === 2 && (
                <text x={W / 2} y={PAD.t + 12} textAnchor="middle" className="fill-sky-300 text-[11px]">
                    разница {(levelAt(lines[1].f, fc, qtc, cabin) - levelAt(lines[0].f, fc, qtc, cabin)).toFixed(1)} дБ
                </text>
            )}
        </svg>
    );
}