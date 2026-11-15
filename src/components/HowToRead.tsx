export function HowToRead({ onExpert }: { onExpert: () => void }) {
    return <section aria-label="Что делать дальше" className="grid gap-3 border-t border-zinc-800 pt-4 text-sm text-zinc-300">
        <h2 className="font-semibold text-zinc-100">Что дальше</h2>
        <ol className="grid list-inside list-decimal gap-2 text-sm leading-relaxed text-zinc-400">
            <li>Сравните цель с объёмом, который получается по габаритам.</li>
            <li>Уточните вытеснение и монтажные размеры: без них расчёт предварительный.</li>
            <li>В экспертном режиме проверьте посадку, 3D и чертёж деталей перед изготовлением.</li>
        </ol>
        <button type="button" onClick={onExpert} className="justify-self-start rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-orange-400 focus-visible:outline-2 focus-visible:outline-orange-400">Перейти к конструкции</button>
    </section>;
}
