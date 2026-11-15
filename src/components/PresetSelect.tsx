import { DRIVER_PRESETS } from "../data/presets";
import type { Driver } from "../core/types";

export function PresetSelect({ onChange, value }: { onChange: (driver: Driver) => void; value?: string }) {
    return <label className="grid min-w-0 gap-2 text-sm font-medium text-zinc-300">Пример динамика
        <select {...(value === undefined ? { defaultValue: "" } : { value })} onChange={(event) => { const preset = DRIVER_PRESETS[Number(event.target.value)]; if (preset) onChange(preset.driver); }} className="min-h-12 w-full min-w-0 max-w-full rounded-xl border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-base text-zinc-100 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20">
            <option value="" disabled>Выбрать пример</option>{DRIVER_PRESETS.map((preset, i) => <option key={preset.name} value={i}>{preset.name}</option>)}
        </select>
    </label>;
}
