import { useState } from "react";

interface Props {
    label: string;
    unit?: string;
    hint: string;
    value: number;
    step?: number;
    error?: string | null;
    onChange: (value: number) => void;
}

export function FieldWithHint({ label, unit, hint, value, step = 1, error, onChange }: Props) {

    const [open, setOpen] = useState(false);

    return (
        <label className="grid gap-1 text-sm">
            <span className="flex items-center gap-2">
                {unit ? `${label}, ${unit}` : label}
                <button
                    type="button"
                    aria-label={`подсказка: ${label}`}
                    onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className={`grid size-5 place-items-center rounded-full border text-[11px] transition ${open ? "border-orange-400 bg-orange-400/15 text-orange-300" : "border-zinc-700 text-zinc-400 hover:border-orange-400 hover:text-orange-300"}`}
                >
                    ?
                </button>
            </span>
            <input
                type="number"
                value={Number.isFinite(value) ? value : ""}
                step={step}
                min={0}
                onChange={(e) => onChange(e.target.value === "" ? NaN : parseFloat(e.target.value)) }
                className={`rounded-md border bg-zinc-950 px-3 py-2 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 ${
                    error ? "border-red-500" : "border-zinc-700"
                }`}
            />
            {open && <span className="rounded-md border border-zinc-800 bg-zinc-950/70 p-2 text-xs leading-relaxed text-zinc-400">{hint}</span>}
            {error && <span className="text-xs text-red-400">{error}</span> }
        </label>
    );
}
