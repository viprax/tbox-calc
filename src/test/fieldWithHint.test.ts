import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FieldWithHint } from "../components/FieldWithHint";

describe("numeric driver fields", () => {
    it("accepts decimal datasheet values and exposes a usable accessible name", () => {
        const html = renderToStaticMarkup(createElement(FieldWithHint, {
            label: "Fs", unit: "Гц", hint: "Резонанс", value: 28.43, onChange: () => {},
        }));
        expect(html).toMatch(/<input[^>]+aria-label="Fs, Гц"/);
        expect(html).toMatch(/<input[^>]+step="any"/);
    });
    it("announces input errors to assistive technology", () => {
        const html = renderToStaticMarkup(createElement(FieldWithHint, {
            label: "Fs", hint: "Резонанс", value: 0, error: "Введите положительное число", onChange: () => {},
        }));
        expect(html).toContain('aria-invalid="true"');
        expect(html).toContain('aria-describedby=');
    });
});
