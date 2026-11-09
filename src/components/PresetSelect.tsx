import { DRIVER_PRESETS } from "../data/presets";
import type { DriverTS } from "../core/types";

export function PresetSelect({ onChange }: { onChange: (driver: DriverTS, diameterInch?: number) => void }) {
    return <label className="flex items-center gap-2 text-sm text-zinc-400">Пример динамика
        <select defaultValue="" onChange={(event) => { const preset = DRIVER_PRESETS[Number(event.target.value)]; if (preset) onChange(preset.driver, preset.diameterInch); }} className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-200 focus:border-orange-400 focus:outline-none">
            <option value="" disabled>Выбрать пример</option>{DRIVER_PRESETS.map((preset, i) => <option key={preset.name} value={i}>{preset.name}</option>)}
        </select>
    </label>;
}
