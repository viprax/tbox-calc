import { ClosedBoxPage } from "./pages/ClosedBoxPage";

export default function App() {
    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-100">
            <header className="border-b border-zinc-800 px-5 py-3 font-semibold">TBox</header>
            <ClosedBoxPage />
        </div>
    );
}