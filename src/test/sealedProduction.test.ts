import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResponseChart } from "../components/ResponseChart";
import { CABIN_GAIN_DEFAULT } from "../core/cabinGain";
import { createSealedDraft } from "../state/sealedDraft";
import { ClosedBoxPage } from "../pages/ClosedBoxPage";

describe("sealed production UI", () => {
    it("offers a distinct panel drawing mode", () => {
        const html = renderToStaticMarkup(createElement(ClosedBoxPage, { initialDraft: { ...createSealedDraft(), mode: "expert" } }));
        expect(html).toContain('aria-pressed="false"');
        expect(html).toContain('>Чертёж</button>');
        expect(html).not.toContain("Геометрия и ограничения размеров экспериментальные");
    });
    it("shows both the original and cabin-adjusted curve when cabin gain is enabled", () => {
        const enabled = renderToStaticMarkup(createElement(ResponseChart, { fc: 60, qtc: 0.8, cabin: { ...CABIN_GAIN_DEFAULT, enabled: true } }));
        const disabled = renderToStaticMarkup(createElement(ResponseChart, { fc: 60, qtc: 0.8 }));
        expect(enabled).toContain('data-curve="base"');
        expect(enabled).toContain('data-curve="cabin"');
        expect(disabled).not.toContain('data-curve="cabin"');
    });
});

 describe("cabin response visibility", () => {
    it("keeps a large illustrative boost and its baseline inside the SVG plot", () => {
        const html = renderToStaticMarkup(createElement(ResponseChart, { fc: 60, qtc: 0.8, cabin: { ...CABIN_GAIN_DEFAULT, enabled: true, boostDb: 18 } }));
        const paths = [...html.matchAll(/<path[^>]*data-curve="[^"]+"[^>]*d="([^"]+)"/g)];
        expect(paths).toHaveLength(2);
        for (const path of paths) {
            const points = [...path[1].matchAll(/[ML][\d.]+,([\d.]+)/g)];
            expect(points.length).toBeGreaterThan(100);
            for (const point of points) expect(Number(point[1])).toBeGreaterThanOrEqual(12);
            for (const point of points) expect(Number(point[1])).toBeLessThanOrEqual(292);
        }
        expect(html).toContain("пик");
    });
});
