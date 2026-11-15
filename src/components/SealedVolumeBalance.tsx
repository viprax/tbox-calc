import type { ReturnTypeOfSealedEvaluation } from "../state/evaluateSealedDraft";
import type { SealedBoxDraft } from "../state/sealedDraft";

export function SealedVolumeBalance({ draft, model, onExpert, onAccept }: { draft: SealedBoxDraft; model: ReturnTypeOfSealedEvaluation; onExpert: () => void; onAccept: () => void }) {
    const box = model.calculation?.dimensions;
    if (!box) return null;
    const known = model.netVolumeKnown;
    const target = draft.responseBasis === "target";
    return <section aria-label="Баланс объёма" className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Объём корпуса</h2><span className="text-xs text-zinc-400">Цель: {draft.vb.toFixed(2)} л</span></div>
        <dl className="grid gap-4 min-[420px]:grid-cols-3">
            <div><dt className="text-xs text-zinc-400">Общий объём внутри</dt><dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{box.grossVolumeL.toFixed(2)} л</dd></div>
            <div><dt className="text-xs text-zinc-400">Вычитаем из общего объёма</dt><dd className="mt-1 text-sm">Динамик: {known ? `${draft.driverDisplacementL?.toFixed(2)} л` : "неизвестно"}</dd><dd className="text-xs text-zinc-400">Детали: {draft.bracesDisplacementL.toFixed(2)} л</dd></div>
            <div><dt className="text-xs text-zinc-400">{known ? "Чистый объём" : "Чистый объём пока неизвестен"}</dt><dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-orange-300">{known ? `${box.volumeL.toFixed(2)} л` : "—"}</dd></div>
        </dl>
        {!known ? <div className="border-t border-zinc-800 pt-3 text-sm text-amber-200"><p>Вытеснение не задано. {target ? `График показывает прогноз для выбранных ${draft.vb.toFixed(2)} л.` : `Без вычета динамика график предварительно рассчитан по ${box.volumeL.toFixed(2)} л.`}</p><button type="button" onClick={onExpert} className="mt-2 min-h-10 text-left underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-orange-400">Указать вытеснение и проверить корпус</button></div>
            : !model.targetMatches && <div className="border-t border-zinc-800 pt-3 text-sm text-amber-200"><p>По размерам получается {box.volumeL.toFixed(2)} л, цель — {draft.vb.toFixed(2)} л. {target ? "График показывает целевой объём." : "График рассчитан по объёму конструкции."}</p><button type="button" onClick={onAccept} className="mt-3 min-h-10 rounded-xl border border-orange-500/50 px-3 text-xs text-orange-200 hover:bg-orange-500/10 focus-visible:outline-2 focus-visible:outline-orange-400">Принять расчётный объём {box.volumeL.toFixed(2)} л</button></div>}
    </section>;
}
