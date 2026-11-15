import { useEffect, useState, type SetStateAction } from "react";
import { createSealedDraft, decodeSealedDraft, encodeSealedDraft, SEALED_DRAFT_KEY, type SealedBoxDraft } from "../state/sealedDraft";

function readDraft(initial?: SealedBoxDraft) {
    if (initial || typeof window === "undefined") return { draft: initial ?? createSealedDraft(), restored: false, storageError: false };
    try {
        const raw = window.localStorage.getItem(SEALED_DRAFT_KEY);
        const restored = raw === null ? null : decodeSealedDraft(raw);
        return { draft: restored ?? createSealedDraft(), restored: restored !== null, storageError: false };
    } catch { return { draft: createSealedDraft(), restored: false, storageError: true }; }
}

export function useSealedDraft(initial?: SealedBoxDraft) {
    const [loaded] = useState(() => readDraft(initial));
    const [draft, setDraft] = useState(loaded.draft);
    const [storageError, setStorageError] = useState(loaded.storageError);
    useEffect(() => {
        let active = true;
        try { window.localStorage.setItem(SEALED_DRAFT_KEY, encodeSealedDraft(draft)); }
        catch { queueMicrotask(() => { if (active) setStorageError(true); }); }
        return () => { active = false; };
    }, [draft]);

    const field = <K extends keyof SealedBoxDraft>(key: K) => (next: SetStateAction<SealedBoxDraft[K]>) => {
        setDraft(previous => ({ ...previous, [key]: typeof next === "function" ? (next as (value: SealedBoxDraft[K]) => SealedBoxDraft[K])(previous[key]) : next }));
    };
    return { draft, setDraft, field, storageError, restored: loaded.restored };
}
