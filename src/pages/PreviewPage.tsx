const layouts: Record<string, { intro: string; cards: [string, string][] }> = {
 account: { intro: "Ваши расчёты и черновики в одном месте", cards: [["Проект · закрытый ящик", "Пример карточки: динамик, объём, материал и дата изменения"], ["Проект · фазоинвертор", "Пример карточки: объём, настройка и геометрия порта"], ["Новый черновик", "Место для следующего расчёта"]] },
 drivers: { intro: "Параметры динамиков с указанием источника", cards: [["Поиск по модели", "Марка, диаметр и тип динамика"], ["Edge EDS15D1-E7", "15″ · пример из калькулятора. Часть параметров требует подтверждения."], ["Паспорт динамика", "Fs · Qts · Vas · Sd · Xmax, монтажные размеры и ссылка на документацию"]] },
 help: { intro: "От параметров динамика до размеров короба", cards: [["Введите параметры", "На вкладке «График» задайте Fs, Qts, Vas и целевой нетто-объём."], ["Подберите геометрию", "На вкладке «2D короб» задайте материал, монтажные размеры и ограничения багажника."], ["Проверьте результат", "Сравните фактический объём с целевым, изучите АЧХ и предупреждения."]] },
 support: { intro: "Помогите TBox стать точнее и удобнее", cards: [["Обратная связь", "Опишите сценарий, входные значения и ожидаемый результат."], ["Эталоны расчётов", "Сравнения с SpeakerShop помогают проверять модели."], ["Добровольная поддержка", "Макет будущего раздела поддержки. Платёжные сервисы не подключены."]] },
};
export function PreviewPage({ id, title, onBack }: { id: string; title: string; onBack: () => void }) {
 const layout = layouts[id] ?? { intro: "Параметры оформления, акустический отклик и конструкция", cards: [["Динамик и оформление", "Параметры Тиля — Смолла и выбор схемы"], ["Акустический отклик", "Будущая область графиков и сравнения вариантов"], ["Конструкция", id === "quarter" ? "Длина канала, площадь сечения и схема складывания" : id === "horn" ? "Горло, устье и профиль расширения" : "Объёмы камер, настройка и размещение портов"]] };
 return <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
  <div><p className="mb-3 text-sm text-orange-300">Предпросмотр интерфейса · демонстрационные данные</p><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-3 text-zinc-400">{layout.intro}</p></div>
  <div className="grid gap-5 md:grid-cols-3">{layout.cards.map(([heading, description], i) => <article key={heading} className="min-h-64 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
   <div aria-hidden="true" className="mb-8 flex h-20 items-end gap-2">{[40,70,55,90,65,45].map((height,j) => <span key={j} style={{height: `${height}%`}} className={`flex-1 rounded-t ${j === i ? "bg-orange-500/60" : "bg-zinc-800"}`} />)}</div>
   <h2 className="text-lg font-medium">{heading}</h2><p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
  </article>)}</div>
  <p className="text-sm text-zinc-500">Это макет раздела: расчёты, сохранение и отправка данных здесь не выполняются.</p>
  <button onClick={onBack} className="rounded-lg bg-orange-500 px-5 py-3 text-sm text-white transition hover:bg-orange-400">Вернуться к закрытому ящику</button>
 </main>;
}
