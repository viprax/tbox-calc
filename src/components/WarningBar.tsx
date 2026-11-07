import type { BoxWarning, WarningLevel } from "../core/warnings";

const BORDER: Record<WarningLevel | "ok", string> = {
    ok: "border-emerald-500",
    info: "border-sky-500",
    warn: "border-amber-500",
    error: "border-red-500",
};

interface Props {
    warnings: BoxWarning[];
}

/** Предупреждения из checkClosedBox. Пустой список - ящик в норме. */
export function WarningBar({ warnings }: Props) {
    if (warnings.length === 0) {
        return (
            <div className={`rounded border-l-4 ${BORDER.ok} bg-zinc-900 px-3 py-2`}>
                Ящик в норме по расчёту.
            </div>
        );
    }
    return (
        <ul className="grid gap-2">
            {warnings.map((w) => (
                <li
                    key={w.code}
                    className={`rounded border-l-4 ${BORDER[w.level]} bg-zinc-900 px-3 py-2`}
                >
                    {w.message}
                </li>
            ))}
        </ul>
    );
}