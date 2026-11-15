import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClosedBoxPage } from "../pages/ClosedBoxPage";
import { createSealedDraft, decodeSealedDraft, encodeSealedDraft } from "../state/sealedDraft";

const render = (mode: "simple" | "expert") => renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode } }));
describe("unified sealed workspace", () => {
    it("offers every result view regardless of the saved legacy mode", () => {
        for (const mode of ["simple", "expert"] as const) {
            const html = render(mode);
            expect(html).not.toContain('aria-label="Режим калькулятора ЗЯ"');
            for (const text of ["График", "2D короб", "3D", "Чертёж"]) expect(html).toContain(`>${text}</button>`);
            expect(html).toContain('aria-label="Fs, Гц"');
            expect(html).not.toContain("Источники параметров");
            expect(html).not.toContain("90%");
            expect(html).not.toContain("Какой корпус попробовать?");
        }
    });
    it("restores old drafts with an explicit target basis without losing inputs", () => {
        const draft = createSealedDraft();
        const stored = JSON.parse(encodeSealedDraft(draft));
        delete stored.draft.responseBasis;
        const restored = decodeSealedDraft(JSON.stringify(stored));
        expect(restored).toEqual({ ...draft, responseBasis: "target" });
    });
    it("keeps the old expert construction basis and restores all edited values", () => {
        const draft = { ...createSealedDraft(), mode: "expert" as const, view: "drawing" as const, vb: 30, driverDisplacementL: 4 };
        const stored = JSON.parse(encodeSealedDraft(draft));
        delete stored.draft.responseBasis;
        expect(decodeSealedDraft(JSON.stringify(stored))).toEqual({ ...draft, responseBasis: "construction" });
    });
    it("uses the same curve for both legacy modes when the chosen basis matches", () => {
        const curve = (mode: "simple" | "expert", basis: "target" | "construction") => {
            const html = renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode, responseBasis: basis } }));
            return html.match(/data-curve="base" d="([^"]+)"/)?.[1];
        };
        expect(curve("simple", "target")).toBeTruthy();
        expect(curve("simple", "target")).toBe(curve("expert", "target"));
        expect(curve("simple", "construction")).toBe(curve("expert", "construction"));
        expect(curve("simple", "construction")).not.toBe(curve("simple", "target"));
    });
});
