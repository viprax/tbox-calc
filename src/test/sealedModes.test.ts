import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClosedBoxPage } from "../pages/ClosedBoxPage";
import { createSealedDraft } from "../state/sealedDraft";

const render = (mode: "simple" | "expert", changes = {}) => renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode, ...changes } }));

describe("simple/expert sealed interface", () => {
    it("starts with simple controls, metrics and an explicit provisional-volume warning", () => {
        const html = render("simple");
        expect(html).toContain('aria-pressed="true"');
        expect(html).toContain("Простой"); expect(html).toContain("Экспертный");
        expect(html).toContain('aria-label="Желаемый объём для воздуха, л"');
        expect(html).toContain('aria-label="АЧХ закрытого ящика"');
        expect(html).not.toContain('aria-label="Fs, Гц"');
        expect(html).not.toContain('aria-label="Глубина установки, мм"');
        expect(html).toContain("Чистый объём пока неизвестен");
        expect(html).toContain("40.51");
    });
    it("keeps expert TS, construction and all four views available", () => {
        const html = render("expert");
        expect(html).toContain('aria-label="Fs, Гц"');
        expect(html).toContain('aria-label="Глубина установки, мм"');
        expect(html).toContain('>Чертёж</button>');
        expect(html).toContain("Задать внутренние размеры вручную");
        expect(html).toContain("Объём распорок и деталей");
    });
    it("shows hidden-input errors in simple mode and offers an expert repair path", () => {
        const html = render("simple", { customDims: true, dimsMm: { w: -1, h: 400, d: 300 } });
        expect(html).toContain('role="alert"');
        expect(html).toContain("Ширина внутри");
        expect(html).not.toContain('aria-label="АЧХ закрытого ящика"');
        expect(html).toContain("Открыть настройки");
    });
    it("never labels unknown displaced volume as an achieved20L net design", () => {
        const html = render("simple");
        expect(html).not.toContain("Цель достигнута");
        expect(html).toContain("Цель: 20.00 л");
        expect(html).toContain("График показывает прогноз для выбранных 20.00 л");
    });
});


it("offers an expert repair path for a hidden displacement that leaves no cavity volume", () => {
    const html = render("simple", { driverDisplacementL: 1000, customDims: true, dimsMm: { w: 450, h: 420, d: 300 } });
    expect(html).toContain("Вытеснение оборудования не оставляет");
    expect(html).toContain("Открыть настройки");
});

it("expands installation conflicts immediately for an expert, rather than hiding them under a summary", () => {
    const html = render("expert", { view: "3d", customDims: true, dimsMm: { w: 450, h: 420, d: 100 } });
    expect(html).toMatch(/<details[^>]+aria-label="Ограничения конструкции"[^>]+open=""/);
});
