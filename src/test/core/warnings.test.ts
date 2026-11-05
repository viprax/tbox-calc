import { describe, expect, it } from "vitest";
import { closedBox } from "../../core/closedBox";
import { checkClosedBox, hasErrors, type BoxCheckInput, type BoxWarning } from "../../core/warnings";
import type { DriverTS } from "../../core/types";

const ts: DriverTS = { fs: 32, qts: 0.42, vas: 45, sd: 340, xmax: 7 };

const codes = (ws: BoxWarning[]) => ws.map((w) => w.code);

function run(vb: number, extra: Partial<BoxCheckInput> = {}): BoxWarning[] {
    const driver = extra.ts ?? ts;
    const box = closedBox(driver, vb);
    return checkClosedBox({ ts: driver, vb, box, type: "subwoofer", ...extra });
}

describe("Qtc", () => {
    it("хороший ящик (Qtc около 0.61, Vb 40 л) без предупреждений", () => {
        expect(run(40)).toEqual([]);
    });

    it("Qtc 0.76 даёт предупреждение о подъёме на низах", () => {
        const ws = run(20);
        expect(codes(ws)).toContain("qtc_peaky");
        expect(ws.find((w) => w.code === "qtc_peaky")?.level).toBe("warn");
        expect(ws.find((w) => w.code === "qtc_peaky")?.message).toMatch(/0\.76/);
    });

    it("Qtc 0.84 тоже попадает в диапазон предупреждения", () => {
        expect(codes(run(15))).toContain("qtc_peaky");
    });

    it("Qtc выше 0.9 даёт ошибку, а не только предупреждение", () => {
        const ws = run(5);
        expect(codes(ws)).toContain("qtc_very_peaky");
        expect(hasErrors(ws)).toBe(true);
    });

    it("Qtc ниже 0.5 даёт информационное сообщение", () => {
        const box = { alpha: 1, fc: 50, qtc: 0.3, f3: 40, peakDb: 0 };
        const ws = checkClosedBox({ ts, vb: 40, box, type: "subwoofer" });
        expect(codes(ws)).toEqual(["qtc_overdamped"]);
        expect(ws[0].level).toBe("info");
    });
});

describe("объём ящика", () => {
    it("очень маленький Vb предупреждает о единицах", () => {
        expect(codes(run(0.5))).toContain("vb_too_small");
    });

    it("очень большой Vb даёт информационное сообщение", () => {
        const ws = run(300);
        expect(codes(ws)).toContain("vb_too_large");
        expect(ws.find((w) => w.code === "vb_too_large")?.level).toBe("info");
    });
});

describe("частота раздела", () => {
    it("fc выше 80 Гц у сабвуфера даёт предупреждение", () => {
        // Vb 5 л: fc около 101 Гц
        expect(codes(run(5))).toContain("fc_above_crossover");
    });

    it("порог раздела можно задать явно", () => {
        // Vb 40 л: fc около 46.6 Гц, выше раздела 40 Гц
        expect(codes(run(40, { crossoverHz: 40 }))).toContain("fc_above_crossover");
    });

    it("fc ниже раздела не даёт предупреждения", () => {
        expect(codes(run(40))).not.toContain("fc_above_crossover");
    });
});

describe("Xmax", () => {
    it("малый Xmax у сабвуфера даёт информационное сообщение", () => {
        const ws = run(40, { ts: { ...ts, xmax: 3 } });
        expect(codes(ws)).toContain("xmax_small");
        expect(ws.find((w) => w.code === "xmax_small")?.level).toBe("info");
    });

    it("для мидбаса проверка Xmax не выполняется", () => {
        const ws = run(40, { ts: { ...ts, xmax: 3 }, type: "midbass" });
        expect(codes(ws)).not.toContain("xmax_small");
    });
});

describe("тип динамика", () => {
    it("твитер в закрытом ящике даёт ошибку", () => {
        const ws = run(40, { type: "tweeter" });
        expect(codes(ws)).toContain("wrong_type_for_box");
        expect(hasErrors(ws)).toBe(true);
    });

    it("без типа специфичные для сабвуфера проверки не выполняются", () => {
        const ws = run(5, { type: undefined, ts: { ...ts, xmax: 3 } });
        expect(codes(ws)).not.toContain("fc_above_crossover");
        expect(codes(ws)).not.toContain("xmax_small");
    });
});

describe("hasErrors", () => {
    it("возвращает false, если есть только предупреждения и информация", () => {
        expect(hasErrors(run(20))).toBe(false);
    });
});