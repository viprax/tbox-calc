import { useMemo, useState, type MouseEvent, type KeyboardEvent } from "react";
import { portedResponseDb, portedLevelAt, type PortedParams } from "../core/portedResponse";
import { dbScale } from "../core/chartScale";
import { CABIN_GAIN_DEFAULT, type CabinGain } from "../core/cabinGain";
import { parseReference } from "../core/portedReference";
import { freqFromX, shiftFreq } from "../core/response";
import { PORTED_REFERENCES } from "../data/portedReferences";

const W = 640, H = 320;
const PAD = { l: 44, r: 12, t: 12, b: 28 };
const F_MIN = 10, F_MAX = 300;
const X_TICKS = [10, 20, 30, 50, 100, 200];

const xOf = (f: number) =>
    PAD.l + ((Math.log(f) - Math.log(F_MIN)) / (Math.log(F_MAX) - Math.log(F_MIN))) * (W - PAD.l - PAD.r);


interface Props {
    params: PortedParams;
    debug?: boolean;
    cabin?: CabinGain;
}

export function PortedCompareChart({ params, debug = false, cabin = CABIN_GAIN_DEFAULT }: Props) {
    const [hover, setHover] = useState<number | null>(null);
    const [markers, setMarkers] = useState<number[]>([]);
    const [activeMarker, setActiveMarker] = useState<number | null>(null);
    const [manualText, setManualText] = useState<string | null>(null);
    const matchingReference = PORTED_REFERENCES.find(
        (candidate) => Math.abs(params.fs - 32.3) < 1e-6
            && Math.abs(params.qts - 0.28) < 1e-6 && Math.abs(params.vas - 50.8) < 1e-6
            && Math.abs(candidate.vbL - params.vb) < 0.1
            && Math.abs(candidate.fbHz - params.fb) < 1.5
            && candidate.ql === params.ql,
    );
    const text = manualText ?? matchingReference?.points.map(({ f, db }) => `${f} ${db}`).join("\n") ?? "";
    const ref = useMemo(() => parseReference(text), [text]);
    const difference = useMemo(() => {
        if (ref.length === 0) return null;
        const squaredError = ref.reduce(
            (sum, point) => sum + (portedResponseDb(point.f, params) - point.db) ** 2,
            0,
        );
        return Math.sqrt(squaredError / ref.length);
    }, [params, ref]);

    const ours = useMemo(() => {
        const pts: { f: number; db: number }[] = [];
        const lo = Math.log(F_MIN), hi = Math.log(F_MAX);
        for (let i = 0; i < 300; i++) {
            const f = Math.exp(lo + ((hi - lo) * i) / 299);
            pts.push({ f, db: portedLevelAt(f, params, cabin) });
        }
        return pts;
    }, [params, cabin]);

    const referenceModel = useMemo(() => {
        if (!debug || !matchingReference || Math.abs(matchingReference.fbHz - params.fb) < 0.01) return null;
        const benchmarkParams = { ...params, fb: matchingReference.fbHz };
        const pts: { f: number; db: number }[] = [];
        const lo = Math.log(F_MIN), hi = Math.log(F_MAX);
        for (let i = 0; i < 300; i++) {
            const f = Math.exp(lo + ((hi - lo) * i) / 299);
            pts.push({ f, db: portedResponseDb(f, benchmarkParams) });
        }
        return pts;
    }, [debug, matchingReference, params]);

    const benchmarkDifference = useMemo(() => {
        if (!debug || !matchingReference) return null;
        const benchmarkParams = { ...params, fb: matchingReference.fbHz };
        const squaredError = matchingReference.points.reduce(
            (sum, point) => sum + (portedResponseDb(point.f, benchmarkParams) - point.db) ** 2,
            0,
        );
        return Math.sqrt(squaredError / matchingReference.points.length);
    }, [debug, matchingReference, params]);

    const axis = useMemo(() => dbScale([
        ...ours.map((point) => point.db),
        ...(debug ? ref.map((point) => point.db) : []),
        ...(referenceModel?.map((point) => point.db) ?? []),
    ]), [ours, debug, ref, referenceModel]);
    const yOf = (db: number) => PAD.t + (axis.max - db) / (axis.max - axis.min) * (H - PAD.t - PAD.b);

    const toPath = (pts: { f: number; db: number }[]) =>
        pts.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.f).toFixed(1)},${yOf(p.db).toFixed(1)}`).join(" ");

    const frequencyAt = (event: MouseEvent<SVGSVGElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return freqFromX((event.clientX - rect.left) * W / rect.width, PAD.l, W - PAD.r);
    };
    const onClick = (event: MouseEvent<SVGSVGElement>) => {
        if (event.button !== 0) return;
        const frequency = frequencyAt(event);
        const index = markers.length < 2 ? markers.length : 0;
        setMarkers((previous) => {
            const next = [...previous];
            next[index] = frequency;
            return next;
        });
        setActiveMarker(index);
    };
    const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const base = activeMarker === null ? hover ?? params.fb : markers[activeMarker];
        const next = shiftFreq(base, event.key === "ArrowRight" ? 1 : -1);
        setHover(next);
        if (activeMarker !== null) setMarkers((previous) => previous.map((f, index) => index === activeMarker ? next : f));
    };

    return (
        <div className="grid min-w-0 gap-3">
            {debug && <textarea
                aria-label="Контрольные точки АЧХ"
                value={text}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={"Вставь точки из SpeakerShop: частота и уровень через пробел\n20 -18.5\n33 -3.1\n60 -0.4"}
                rows={5}
                className="w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 p-2 font-mono text-xs"
            />}
            {debug && manualText !== null && matchingReference && (
                <button
                    type="button"
                    className="justify-self-start text-xs text-sky-300 underline underline-offset-2"
                    onClick={() => setManualText(null)}
                >
                    Вернуть эталон {matchingReference.vbL} л / {matchingReference.fbHz} Гц
                </button>
            )}
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={debug ? "Сравнение АЧХ фазоинвертора" : "АЧХ фазоинвертора"} className="h-auto w-full outline-none focus:ring-1 focus:ring-orange-400"
                tabIndex={0}
                onMouseMove={(event) => setHover(frequencyAt(event))}
                onMouseLeave={() => setHover(null)}
                onClick={onClick}
                onKeyDown={onKeyDown}
                onContextMenu={(event) => { event.preventDefault(); setMarkers([]); setActiveMarker(null); }}
            >
                {axis.ticks.map((db) => (
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
                <line x1={PAD.l} x2={W - PAD.r} y1={yOf(-3)} y2={yOf(-3)} className="stroke-zinc-400/60 [stroke-dasharray:4_4]" />
                <path d={toPath(ours)} fill="none" className="stroke-orange-400 stroke-[2.5]" />
                {referenceModel && (
                    <path d={toPath(referenceModel)} fill="none" className="stroke-emerald-400 stroke-[1.5]" />
                )}
                {debug && ref.length > 1 && (
                    <path d={toPath(ref)} fill="none" className="stroke-sky-400 stroke-[2]" strokeDasharray="6 4" />
                )}
                {debug && ref.map((point) => (
                    <circle key={`${point.f}-${point.db}`} cx={xOf(point.f)} cy={yOf(point.db)} r={2.7} className="fill-sky-300" />
                ))}
                {hover !== null && <g>
                    <line x1={xOf(hover)} x2={xOf(hover)} y1={PAD.t} y2={H - PAD.b} className="stroke-zinc-300/50" />
                    <text x={xOf(hover) + (xOf(hover) > W - 150 ? -4 : 4)} y={PAD.t + 12} textAnchor={xOf(hover) > W - 150 ? "end" : "start"} className="fill-zinc-200 text-[11px]">
                        {hover.toFixed(1)} Гц, {portedLevelAt(hover, params, cabin).toFixed(1)} дБ
                    </text>
                </g>}
                {markers.map((frequency, index) => <line key={index} x1={xOf(frequency)} x2={xOf(frequency)} y1={PAD.t} y2={H - PAD.b} className="stroke-sky-400 stroke-[1.5]" />)}
                {markers.length === 2 && <text x={W / 2} y={PAD.t + 12} textAnchor="middle" className="fill-sky-300 text-[11px]">
                    разница {(portedLevelAt(markers[1], params, cabin) - portedLevelAt(markers[0], params, cabin)).toFixed(1)} дБ
                </text>}
            </svg>
            {debug ? <p className="text-xs text-zinc-400">
                Оранжевая — по Fb из размеров порта; голубая — {matchingReference && manualText === null ? matchingReference.label : "точки из программы"}.
                {difference !== null && ` ${ref.length} точек, RMS ${difference.toFixed(2)} дБ.`}
                {referenceModel && benchmarkDifference !== null && ` Зелёная — модель при Fb ${matchingReference?.fbHz} Гц, RMS ${benchmarkDifference.toFixed(2)} дБ.`}
            </p> : <p className="text-xs text-zinc-500">Наведи курсор — частота и уровень · два клика — сравнение · стрелки — сдвиг выбранной линии · правая кнопка — сброс</p>}
        </div>
    );
}
