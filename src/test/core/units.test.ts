import { describe, expect, it } from "vitest";
import {
    cm3ToLiters,
    cmToM,
    cmToMm,
    litersToCm3,
    litersToM3,
    m3ToLiters,
    mToCm,
    mmToCm,
} from "../../core/units.ts";

describe("длины", () => {
    it("миллиметры переводятся в сантиметры", () => {
        expect(mmToCm(180)).toBe(18);
        expect(mmToCm(5)).toBeCloseTo(0.5, 10);
    });

    it("сантиметры переводятся в миллиметры", () => {
        expect(cmToMm(18)).toBe(180);
    });

    it("сантиметры переводятся в метры и обратно", () => {
        expect(cmToM(250)).toBeCloseTo(2.5, 10);
        expect(mToCm(2.5)).toBeCloseTo(250, 10);
    });

    it("миллиметры -> сантиметры -> миллиметры возвращают исходное число", () => {
        expect(cmToMm(mmToCm(345))).toBeCloseTo(345, 10);
    });
});

describe("объёмы", () => {
    it("кубические метры переводятся в литры", () => {
        expect(m3ToLiters(0.03)).toBeCloseTo(30, 10);
    });

    it("литры переводятся в кубические метры и обратно", () => {
        expect(litersToM3(30)).toBeCloseTo(0.03, 10);
        expect(m3ToLiters(litersToM3(45))).toBeCloseTo(45, 10);
    });

    it("литры переводятся в кубические сантиметры и обратно", () => {
        expect(litersToCm3(20)).toBe(20000);
        expect(cm3ToLiters(20000)).toBeCloseTo(20, 10);
    });
});