import { PreviewPage } from "./pages/PreviewPage";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ClosedBoxPage } from "./pages/ClosedBoxPage";
import { PortedBoxPage } from "./pages/PortedBoxPage";

const planned = {
    quarter: ["Четвертьволновой резонатор", "Расчёт ЧВ появится после проверки закрытого ящика и фазоинвертора."],
    bp4: ["Бандпасс 4-го порядка", "Модель и чертежи запланированы."],
    bp6: ["Бандпасс 6-го порядка", "Модель и чертежи запланированы."],
    horn: ["Рупор", "Расчёт рупорного оформления запланирован."],
    account: ["Мои проекты", "Здесь будут 2 готовых проекта и 1 черновик. Вход и облачное сохранение пока не подключены."],
    drivers: ["База динамиков", "Каталог с подтверждёнными параметрами появится позже. Сейчас параметры вводятся вручную."],
    help: ["Как пользоваться", "Введите параметры динамика, выберите оформление, настройте объём и габариты. Полная справка готовится."],
    support: ["Поддержать разработчика", "Все расчёты останутся бесплатными. Добровольная поддержка, в том числе ежемесячная, планируется; приём платежей пока не подключён."],
} as const;
type Tab = "closed" | "ported" | keyof typeof planned;
const enclosureOptions = [
    ["closed", "Закрытый ящик"],
    ["ported", "Фазоинвертор"],
    ["quarter", "ЧВ-резонатор · в разработке"],
    ["bp4", "Бандпасс 4 · в разработке"],
    ["bp6", "Бандпасс 6 · в разработке"],
    ["horn", "Рупор · в разработке"],
] as const;
const menuItems = ["account", "drivers", "help", "support"] as const;
type DragState = { pointerId: number; startX: number; startScrollLeft: number; moved: boolean };

export default function App() {
    const [tab, setTab] = useState<Tab>("closed");
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuMounted, setMenuMounted] = useState(false);
    const closeTimer = useRef<number | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const typeNavRef = useRef<HTMLElement>(null);
    const typeButtonRefs = useRef(new Map<Tab, HTMLButtonElement>());
    const dragRef = useRef<DragState | null>(null);
    const suppressTypeClick = useRef(false);
    const [draggingTypes, setDraggingTypes] = useState(false);
    const [typeIndicator, setTypeIndicator] = useState<{ left: number; width: number } | null>(null);
    const previousTab = useRef(tab);

    useLayoutEffect(() => {
        const nav = typeNavRef.current;
        const button = typeButtonRefs.current.get(tab);
        if (!nav || !button) return;

        const updateIndicator = () => {
            setTypeIndicator((current) => {
                const next = { left: button.offsetLeft, width: button.offsetWidth };
                if (current?.left === next.left && current.width === next.width) return current;
                return next;
            });
        };
        const navRect = nav.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        if (buttonRect.left < navRect.left || buttonRect.right > navRect.right) {
            button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
        updateIndicator();
        const observer = new ResizeObserver(updateIndicator);
        observer.observe(nav);
        observer.observe(button);
        return () => observer.disconnect();
    }, [tab]);

    useEffect(() => {
        const onPointerMove = (event: PointerEvent) => {
            const drag = dragRef.current;
            const nav = typeNavRef.current;
            if (!drag || !nav || event.pointerId !== drag.pointerId) return;
            const delta = event.clientX - drag.startX;
            if (!drag.moved && Math.abs(delta) < 4) return;
            drag.moved = true;
            setDraggingTypes(true);
            nav.scrollLeft = drag.startScrollLeft - delta;
            event.preventDefault();
        };
        const onPointerUp = (event: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || event.pointerId !== drag.pointerId) return;
            dragRef.current = null;
            setDraggingTypes(false);
            if (drag.moved) {
                suppressTypeClick.current = true;
                window.setTimeout(() => { suppressTypeClick.current = false; }, 0);
            }
        };
        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerUp);
        };
    }, []);

    useEffect(() => {
        if (previousTab.current === tab) return;
        previousTab.current = tab;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        contentRef.current?.getAnimations().forEach((animation) => animation.cancel());
        contentRef.current?.animate(
            [{ opacity: 0.72, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }],
            { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
    }, [tab]);

    useEffect(() => () => {
        if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    }, []);

    useEffect(() => {
        if (!menuOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeMenu();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [menuOpen]);

    const openMenu = () => {
        if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
        setMenuMounted(true);
        requestAnimationFrame(() => setMenuOpen(true));
    };
    const closeMenu = () => {
        setMenuOpen(false);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setMenuMounted(false);
            return;
        }
        if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => setMenuMounted(false), 300);
    };
    const chooseMenuItem = (id: (typeof menuItems)[number]) => {
        setTab(id);
        closeMenu();
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-100">
            <header className="relative z-20 border-b border-zinc-800 bg-zinc-900">
                <div className="flex min-h-[68px] items-center gap-4 px-4 py-3 sm:px-6">
                    <span className="shrink-0 font-semibold tracking-wide">TBox</span>
                    <nav ref={typeNavRef} onPointerDown={(event) => {
                        if (event.pointerType !== "mouse" || event.button !== 0) return;
                        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: typeNavRef.current?.scrollLeft ?? 0, moved: false };
                    }} onClickCapture={(event) => {
                        if (suppressTypeClick.current) {
                            event.preventDefault();
                            event.stopPropagation();
                            suppressTypeClick.current = false;
                        }
                    }} className={`relative flex min-w-0 flex-1 snap-x snap-proximity gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-zinc-950 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x select-none ${draggingTypes ? "cursor-grabbing" : "cursor-grab"}`} aria-label="Тип короба">
                        <span aria-hidden="true" className={`pointer-events-none absolute left-0 top-1 bottom-1 z-0 rounded-lg bg-orange-500 shadow-sm shadow-orange-950/50 transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${typeIndicator ? "opacity-100" : "opacity-0"}`} style={typeIndicator ? { width: typeIndicator.width, transform: `translateX(${typeIndicator.left}px)` } : undefined} />
                        {enclosureOptions.map(([id, title]) => {
                            const selected = tab === id;
                            const isPlanned = id in planned;
                            return <button ref={(node) => { if (node) typeButtonRefs.current.set(id, node); else typeButtonRefs.current.delete(id); }} key={id} onClick={() => setTab(id)} aria-current={selected ? "page" : undefined} className={`relative z-10 flex shrink-0 snap-start items-center gap-2 rounded-lg bg-transparent px-3 py-2 text-sm transition-[color,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-orange-400 ${selected ? "text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`}>
                                {title}{isPlanned && <span className={`text-[10px] ${selected ? "text-orange-100" : "text-zinc-600"}`}>план</span>}
                            </button>;
                        })}
                    </nav>
                    <button onClick={openMenu} aria-label="Открыть меню" aria-expanded={menuOpen} aria-controls="app-menu" className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-[color,border-color,background-color,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96] motion-reduce:transition-none hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-orange-400">
                        <span aria-hidden="true" className="text-lg leading-none">☰</span><span className="hidden sm:inline">Меню</span>
                    </button>
                </div>
            </header>
            <div ref={contentRef}>
                <div hidden={tab !== "closed"}><ClosedBoxPage /></div>
                <div hidden={tab !== "ported"}><PortedBoxPage /></div>
                {tab !== "closed" && tab !== "ported" && <PreviewPage id={tab} title={planned[tab][0]} onBack={() => setTab("closed")} />}
            </div>
            {menuMounted && <div className="fixed inset-0 z-40" role="presentation">
                <button aria-label="Закрыть меню" onClick={closeMenu} className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${menuOpen ? "opacity-100" : "opacity-0"}`} />
                <aside id="app-menu" role="dialog" aria-modal="true" aria-label="Меню приложения" aria-hidden={!menuOpen} className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${menuOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}>
                    <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
                        <div><p className="text-xs text-orange-300">TBox</p><h2 className="mt-1 text-xl font-semibold">Разделы</h2></div>
                        <button onClick={closeMenu} aria-label="Закрыть меню" tabIndex={menuOpen ? 0 : -1} className="grid size-10 place-items-center rounded-lg border border-zinc-700 text-xl text-zinc-400 transition-[color,background-color,transform] duration-200 active:scale-90 motion-reduce:transition-none hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-400">×</button>
                    </div>
                    <nav className="grid gap-2 p-4" aria-label="Дополнительные разделы">
                        {menuItems.map((id) => {
                            const [title, description] = planned[id];
                            const icon = { account: "▣", drivers: "◉", help: "?", support: "♡" }[id];
                            return <button key={id} onClick={() => chooseMenuItem(id)} aria-current={tab === id ? "page" : undefined} tabIndex={menuOpen ? 0 : -1} className={`group flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-[color,border-color,background-color,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.99] motion-reduce:transition-none hover:translate-x-1 focus-visible:outline-2 focus-visible:outline-orange-400 ${tab === id ? "border-orange-500/60 bg-orange-500/10" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-600 hover:bg-zinc-800/70"}`}>
                                <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg transition-[color,background-color,transform] duration-250 group-hover:scale-105 ${tab === id ? "bg-orange-500 text-white" : "bg-zinc-800 text-orange-300 group-hover:bg-zinc-700"}`}>{icon}</span>
                                <span><span className="block font-medium text-zinc-100">{title}</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">{description}</span></span>
                            </button>;
                        })}
                    </nav>
                    <p className="mt-auto border-t border-zinc-800 px-6 py-4 text-xs text-zinc-600">Калькуляторы и расчёты доступны бесплатно.</p>
                </aside>
            </div>}
        </div>
    );
}
