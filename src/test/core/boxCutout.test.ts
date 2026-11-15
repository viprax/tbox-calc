import { describe, expect, it } from "vitest";
import { cutoutFitsPanel } from "../../core/boxCutout";

describe("cutoutFitsPanel", () => {
    it("разрешает круг, который помещается по ширине и высоте", () => {
        expect(cutoutFitsPanel(280, 300, 320)).toBe(true);
    });

    it("считает точное касание панели допустимым геометрически", () => {
        expect(cutoutFitsPanel(300, 300, 320)).toBe(true);
    });

    it("отклоняет круг, если он превышает любую сторону панели", () => {
        expect(cutoutFitsPanel(321, 400, 320)).toBe(false);
        expect(cutoutFitsPanel(301, 300, 400)).toBe(false);
    });

    it("проверяет положительность входов с именами параметров", () => {
        expect(() => cutoutFitsPanel(0, 300, 320)).toThrow(/diameterMm/);
    });
});
