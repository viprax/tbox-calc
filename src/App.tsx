import { useState } from "react";
import { ClosedBoxPage } from "./pages/ClosedBoxPage.tsx";
import { PortedBoxPage } from "./pages/PortedBoxPage.tsx";

type Tab = "closed" | "ported";

export default function App() {

    const [tab, setTab] = useState<Tab>("closed");
    const tabBtn = (t: Tab, label: string) => (
        <button
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded ${tab === t ? "bg-orange-500 text-zinc-900" : "text-zinc-300 hover:text-white"}`}
        >
            {label}
        </button>
    );

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="border-b border-zinc-800 px-5 py-3 font-semibold">
          <span className="font-semibold">TBox</span>
          {tabBtn("closed", "Закрытый ящик")}
          {tabBtn("ported", "Фазоинвертор")}
      </header>
        {tab === "closed" ? <ClosedBoxPage /> : <PortedBoxPage />}
    </div>
  );
}