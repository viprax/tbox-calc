import type { DriverTS } from "./types";

/** User-preferred Fs/Qts screening ratio, distinct from standard EBP (Fs/Qes). */
export function enclosureAdvice(ts: Pick<DriverTS, "fs" | "qts">): { ratio: number | null; kind: "sealed" | "either" | "ported" | "unknown" } {
    if (!Number.isFinite(ts.fs) || ts.fs <= 0 || !Number.isFinite(ts.qts) || ts.qts <= 0) return { ratio: null, kind: "unknown" };
    const ratio = ts.fs / ts.qts;
    return { ratio, kind: ratio < 50 ? "sealed" : ratio <= 100 ? "either" : "ported" };
}
