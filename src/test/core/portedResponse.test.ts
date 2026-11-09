import { describe, expect, it } from "vitest";
import { portedCoefficients, portedResponseDb, type PortedParams } from "../../core/portedResponse";

const p: PortedParams = { fs: 32.3, qts: 0.28, vas: 50.8, vb: 190, fb: 30, ql: 10 };

describe("portedResponseDb: свойства 4-го порядка", () => {
    it("на высоких частотах уровень стремится к 0 дБ", () => {
        expect(Math.abs(portedResponseDb(20000, p))).toBeLessThan(0.01);
    });

    it("на очень низких частотах спад около 24 дБ на октаву", () => {
        const slope = portedResponseDb(4, p) - portedResponseDb(8, p);
        expect(slope).toBeLessThan(-22);
        expect(slope).toBeGreaterThan(-26);
    });

    it("коэффициенты конечны и положительны, a1 и a3 различаются", () => {
        const c = portedCoefficients(p);
        for (const v of [c.a1, c.a2, c.a3]) {
            expect(Number.isFinite(v)).toBe(true);
            expect(v).toBeGreaterThan(0);
        }
        expect(c.a1).not.toBeCloseTo(c.a3, 3);
    });

    it("a2 = (alpha + 1)/h + h + 1/(Ql·Qts)", () => {
        const c = portedCoefficients(p);
        const h = p.fb / p.fs;
        const alpha = p.vas / p.vb;
        expect(c.a2).toBeCloseTo((alpha + 1) / h + h + 1 / (p.ql * p.qts), 10);
    });
});

describe("portedResponseDb: сверка с JBL SpeakerShop", () => {
    // Edge EDS15D1-E7, Vb 190 л, Fb 30 Гц, Ql 10, без cabin gain. Точки с курсора программы.
    const reference: [number, number][] = [
        [60, -3.6], [50, -3.6], [44.8, -3.2], [40, -2.4], [37.8, -1.6],
        [33.2, 1.4], [31.9, 2.5], [31.1, 2.9], [30, 3.0], [29.2, 2.0],
        [27, -2.4], [24.9, -7.1], [23.1, -11.2], [20, -17.5],
    ];

    it("каждая точка отличается от программы не больше чем на 0.5 дБ", () => {
        for (const [f, db] of reference) {
            expect(Math.abs(portedResponseDb(f, p) - db)).toBeLessThan(0.5);
        }
    });

    it("среднеквадратичное расхождение меньше 0.25 дБ", () => {
        const sq = reference.reduce((s, [f, db]) => s + (portedResponseDb(f, p) - db) ** 2, 0);
        expect(Math.sqrt(sq / reference.length)).toBeLessThan(0.25);
    });
});