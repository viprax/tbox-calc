import { describe, expect, it } from "vitest";
import { InvalidInputError, assertFinite, assertInRange, assertPositive } from "../../core/assert";

describe("assertFinite", () => {
    it("пропускает обычные числа, включая 0 и отрицательные", () => {
        expect(assertFinite("x", 0)).toBe(0);
        expect(assertFinite("x", -5.5)).toBe(-5.5);
    });

    it("ловит NaN", () => {
        expect(() => assertFinite("Vas", NaN)).toThrow(InvalidInputError);
        expect(() => assertFinite("Vas", NaN)).toThrow(/Vas/);
    });

    it("ловит Infinity", () => {
        expect(() => assertFinite("Fs", Infinity)).toThrow(/Fs/);
        expect(() => assertFinite("Fs", -Infinity)).toThrow(/Fs/);
    });

    it("ловит строки и undefined, даже если выглядят как числа", () => {
        expect(() => assertFinite("Qts", "0.42")).toThrow(/Qts/);
        expect(() => assertFinite("Qts", undefined)).toThrow(/Qts/);
    });
});

describe("assertPositive", () => {
    it("пропускает положительные числа", () => {
        expect(assertPositive("Vb", 20)).toBe(20);
        expect(assertPositive("Vb", 0.001)).toBe(0.001);
    });

    it("ловит ноль и отрицательные", () => {
        expect(() => assertPositive("Vb", 0)).toThrow(/больше нуля/);
        expect(() => assertPositive("Vb", -3)).toThrow(/Vb/);
    });

    it("ловит NaN раньше проверки знака", () => {
        expect(() => assertPositive("Vb", NaN)).toThrow(/конечное число/);
    });
});

describe("assertInRange", () => {
    it("пропускает границы диапазона", () => {
        expect(assertInRange("Qts", 0.1, 0.1, 1.5)).toBe(0.1);
        expect(assertInRange("Qts", 1.5, 0.1, 1.5)).toBe(1.5);
    });

    it("ловит значения вне диапазона и называет границы", () => {
        expect(() => assertInRange("Vas", 2500, 1, 300)).toThrow(/от 1 до 300/);
    });

    it("ловит NaN", () => {
        expect(() => assertInRange("Vas", NaN, 1, 300)).toThrow(/Vas/);
    });
});