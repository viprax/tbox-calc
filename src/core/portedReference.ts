export interface ReferencePoint {
    f: number;
    db: number;
}

/** Parse SpeakerShop rows: "level / frequency" or "frequency level". */
export function parseReference(text: string): ReferencePoint[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/,/g, "."))
        .filter((line) => line.length > 0)
        .map((line) => {
            const values = line.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
            const [first, second] = values;
            return line.includes("/") ? { f: second, db: first } : { f: first, db: second };
        })
        .filter((point): point is ReferencePoint =>
            Number.isFinite(point.f) && Number.isFinite(point.db) && point.f > 0,
        )
        .sort((a, b) => a.f - b.f);
}
