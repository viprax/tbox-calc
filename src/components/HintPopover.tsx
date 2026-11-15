import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

export function HintPopover({ label, text }: { label: string; text: string }) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ left: 16, top: 16, above: false });
    const id = useId();
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => { window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
    }, [open]);
    return <span className="inline-flex shrink-0 align-middle">
        <button type="button" aria-label={`Подсказка: ${label}`} aria-expanded={open} aria-describedby={open ? id : undefined}
            onClick={event => {
                const rect = event.currentTarget.getBoundingClientRect();
                const width = Math.min(352, window.innerWidth - 32);
                const above = window.innerHeight - rect.bottom < 200 && rect.top > 200;
                setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), top: above ? rect.top - 8 : rect.bottom + 8, above });
                setOpen(value => !value);
            }} onBlur={() => setOpen(false)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); } }}
            className={`grid size-5 place-items-center rounded-full border text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-orange-400 ${open ? "border-orange-400 bg-orange-400/15 text-orange-300" : "border-zinc-700 text-zinc-400 hover:border-orange-400 hover:text-orange-300"}`}>?</button>
        {open && typeof document !== "undefined" && createPortal(<span id={id} role="tooltip" style={{ left: position.left, top: position.top, transform: position.above ? "translateY(-100%)" : undefined }} className="pointer-events-none fixed z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-left text-xs leading-relaxed text-zinc-200 shadow-2xl shadow-black/50"><span className="mb-1 block font-medium text-orange-300">{label}</span>{text}</span>, document.body)}
    </span>;
}
