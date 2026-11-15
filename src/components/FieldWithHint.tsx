import { useId } from "react";
import { HintPopover } from "./HintPopover";

interface Props {
    label: string;
    unit?: string;
    hint: string;
    value: number;
    step?: number | "any";
    error?: string | null;
    onChange: (value: number) => void;
}

export function FieldWithHint({ label, unit, hint, value, step = "any", error, onChange }: Props) {
    const hintId = `hint-${useId()}`;
    const increment = typeof step === "number" ? step : 1;

    return <div className="grid min-w-0 gap-2 text-sm">
        <label htmlFor={hintId.replace("hint-", "field-")} className="flex items-center gap-2 font-medium text-zinc-300">
            {unit ? `${label}, ${unit}` : label}
            <HintPopover label={label} text={hint} />
        </label>
        <div className={`flex min-w-0 overflow-hidden rounded-xl border bg-zinc-950/90 transition-[border-color,box-shadow] focus-within:ring-2 focus-within:ring-orange-400/20 ${error ? "border-red-500" : "border-zinc-700 focus-within:border-orange-400"}`}>
            <input id={hintId.replace("hint-", "field-")} type="number" aria-label={unit ? `${label}, ${unit}` : label} aria-invalid={error ? true : undefined} aria-describedby={error ? `${hintId}-error` : undefined} value={Number.isFinite(value) ? value : ""} step={step} min={0} onChange={(event) => onChange(event.target.value === "" ? NaN : parseFloat(event.target.value))} className="min-h-12 min-w-0 flex-1 bg-transparent px-4 py-2 text-base font-medium text-zinc-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            <span className="grid w-11 shrink-0 grid-rows-2 border-l border-zinc-800">
                <button type="button" aria-label={`Увеличить ${label}`} onClick={() => onChange((Number.isFinite(value) ? value : 0) + increment)} className="grid min-h-6 place-items-center text-lg leading-none text-zinc-300 transition-colors active:bg-zinc-700 hover:bg-zinc-800 hover:text-orange-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-400">⌃</button>
                <button type="button" aria-label={`Уменьшить ${label}`} onClick={() => onChange(Math.max(0, (Number.isFinite(value) ? value : 0) - increment))} className="grid min-h-6 place-items-center border-t border-zinc-800 text-lg leading-none text-zinc-300 transition-colors active:bg-zinc-700 hover:bg-zinc-800 hover:text-orange-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-400">⌄</button>
            </span>
        </div>
        {error && <span id={`${hintId}-error`} className="text-xs text-red-400">{error}</span>}
    </div>;
}
