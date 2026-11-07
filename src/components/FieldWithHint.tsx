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
                    className="h-5 w-5 rounded-full border border-zinc-600 text-xs text-zinc-300 hover:border-orange-400"
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
                className={`rounded border bg-zinc-950 px-2 py-1.5 outline-none focus:border-orange-400 ${
                    error ? "border-red-500" : "border-zinc-700"
                }`}
            />
            {open && <span className="text-xs text-zinc-400">{hint}</span>}
            {error && <span className="text-xs text-red-400">{error}</span> }
        </label>
    );
}