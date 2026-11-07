interface Props {
    qtc: number;
    fc: number;
    f3: number;
    peakDb: number;
}

const items = (p: Props) => [
    { label: "Qtc", value: p.qtc.toFixed(2) },
    { label: "fc", value: `${p.fc.toFixed(1)} Гц` },
    { label: "f3", value: `${p.f3.toFixed(1)} Гц` },
    { label: "Горб", value: `${p.peakDb.toFixed(1)} дБ` },
];

export function MetricsRow(props: Props) {
    return (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 sm:grid-cols-4">
            {items(props).map((m) => (
                <div key={m.label}>
                    <span className="block text-xs text-zinc-400">{m.label}</span>
                    <b className="text-xl font-semibold">{m.value}</b>
                </div>
            ))}
        </div>
    );
}