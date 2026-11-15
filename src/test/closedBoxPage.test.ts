import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../App";
import { ClosedBoxPage } from "../pages/ClosedBoxPage";
import { BoxSizePanel } from "../components/BoxSizePanel";
import { solveBoxDimensions } from "../core/boxDimensions";
import { createSealedDraft } from "../state/sealedDraft";
import { DEFAULT_DRIVER } from "../data/drivers";

describe("restored calculator interface", () => {
    it("restores the original navigation, ported section and menu", () => {
        const html = renderToStaticMarkup(createElement(App));
        expect(html).toContain("Фазоинвертор");
        expect(html).toContain("Открыть меню");
        expect(html).toContain("ЧВ-резонатор");
    });
    it("starts with the owner's EDGE data and keeps JL available as an alternative", () => {
        expect(DEFAULT_DRIVER.spec.name).toBe("EDS15D1-E7");
        const html = renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode: "expert" } }));
        expect(html).toContain("EDGE EDS15D1-E7");
        expect(html).toContain("JL Audio 12W0v3-4");
        expect(html).toContain('value="32.3"');
        expect(html).toContain('value="50.8"');
        expect(html).not.toMatch(/NaN|Infinity/);
    });
    it("restores 2D and manual geometry controls", () => {
        const html = renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode: "expert" } }));
        expect(html).toContain("2D короб");
        expect(html).not.toContain("3D-проекция появится позже");
        expect(html).toContain('value="245"');
        expect(html).toContain('value="375"');
        expect(html).toContain("Ограничить габариты багажника");
        expect(html).toContain("Задать внутренние размеры вручную");
    });
});

describe("sealed real-world calculation transparency", () => {
    it("changes the simple-mode response curve when target volume changes below the mounting minimum", () => {
        const render = (vb: number) => renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), vb, mode: "simple" } }));
        const curve = (html: string) => html.match(/<path[^>]*data-curve="base"[^>]*d="([^"]+)"/)?.[1];
        expect(curve(render(20))).toBeTruthy();
        expect(curve(render(20))).not.toBe(curve(render(30)));
    });
    it("shows the20L target separately from40.51L cavity with unknown displacement", () => {
        const html = renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode: "expert" } }));
        expect(html).toContain("Цель: 20.00 л");
        expect(html).toContain("20.00");
        expect(html).toContain("Без вычета динамика");
        expect(html).toContain("40.51");
    });
    it("identifies unmeasured driver data and unaccounted displacement", () => {
        const html = renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode: "expert" } }));
        expect(html).toContain('aria-label="Достоверность исходных данных"');
        expect(html).toContain("На этом экземпляре не измерены");
        expect(html).toContain("Вытеснение не задано");
    });
});


describe("experimental geometry conflict reporting", () => {
    it("does not report general success for the default EDGE box that cannot reach the requested volume", () => {
        const html = renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode: "expert" } }));
        expect(html).toContain("Габариты короба:");
        expect(html).not.toContain("По акустическому расчёту предупреждений нет.");
        expect(html).not.toContain("Ящик в норме");
    });
    it("keeps all solver conflict reasons visible in the 2D panel", () => {
        const box = solveBoxDimensions({ vbNetL: 20, minFrontOuterMm: 411, maxOuterCm: { w: 30 } });
        expect(box.fits).toBe(false);
        expect(box.reasons.length).toBeGreaterThan(0);
        const html = renderToStaticMarkup(createElement(BoxSizePanel, { box, material: "plywood" }));
        for (const reason of box.reasons) expect(html).toContain(reason);
    });
});
