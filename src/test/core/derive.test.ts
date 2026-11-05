import { describe, expect, it } from "vitest";
import {
    derive,
    mmsFromVas,
    qtsFromQmsQes,
    vasFromMms,
    withoutFields,
} from "../../core/derive";

const base = { fs: 32, sd: 340, xmax: 7 };

describe("формулы", () => {
    it("Qts из Qms и Qes", () => {
        expect(qtsFromQmsQes(4, 0.5)).toBeCloseTo(0.4444, 3);
    });

    it("Vas из Mms: около 80 л для Fs 32, Mms 50 г, Sd 340 см²", () => {
        const vas = vasFromMms(32, 50, 340);
        expect(vas).toBeGreaterThan(79);
        expect(vas).toBeLessThan(82);
    });

    it("Mms из Vas возвращает исходную массу", () => {
        const vas = vasFromMms(32, 50, 340);
        expect(mmsFromVas(32, vas, 340)).toBeCloseTo(50, 6);
    });
});

describe("derive: Qts", () => {
    it("вычисляет Qts, если его нет, и помечает как derived", () => {
        const r = derive({ ts: { ...base, qms: 4, qes: 0.5 }, sources: {} });
        expect(r.ts.qts).toBeCloseTo(0.4444, 3);
        expect(r.sources.qts?.source).toBe("derived");
        expect(r.derived).toContain("qts");
    });

    it("не трогает введённый Qts, если расхождение в допуске", () => {
        const r = derive({
            ts: { ...base, qts: 0.444, qms: 4, qes: 0.5 },
            sources: { qts: { source: "datasheet" } },
        });
        expect(r.ts.qts).toBe(0.444);
        expect(r.warnings).toHaveLength(0);
    });

    it("при расхождении даёт предупреждение и предлагает удалить слабые поля", () => {
        const r = derive({
            ts: { ...base, qts: 0.42, qms: 2, qes: 0.3 },
            sources: { qts: { source: "datasheet" } },
        });
        const w = r.warnings.find((x) => x.field === "qts");
        expect(w).toBeDefined();
        expect(w?.removable).toEqual(expect.arrayContaining(["qms", "qes"]));
        expect(r.ts.qts).toBe(0.42);
    });

    it("удаление слабых полей снимает предупреждение и сохраняет введённый Qts", () => {
        const first = derive({
            ts: { ...base, qts: 0.42, qms: 2, qes: 0.3 },
            sources: { qts: { source: "datasheet" } },
        });
        const cleaned = derive(withoutFields(first, ["qms", "qes"]));
        expect(cleaned.warnings).toHaveLength(0);
        expect(cleaned.ts.qts).toBe(0.42);
    });
});

describe("derive: Vas и Mms", () => {
    it("вычисляет Vas из Mms", () => {
        const r = derive({ ts: { ...base, mms: 50 }, sources: {} });
        expect(r.ts.vas).toBeGreaterThan(79);
        expect(r.derived).toContain("vas");
    });

    it("вычисленный Vas не становится вводом: удаление Mms очищает Vas", () => {
        const r = derive({ ts: { ...base, mms: 50 }, sources: {} });
        const after = derive(withoutFields(r, ["mms"]));
        expect(after.ts.vas).toBeUndefined();
    });

    it("повторный расчёт от результата даёт тот же Vas", () => {
        const r1 = derive({ ts: { ...base, mms: 50 }, sources: {} });
        const r2 = derive(r1);
        expect(r2.ts.vas).toBeCloseTo(r1.ts.vas as number, 6);
        expect(r2.derived).toContain("vas");
    });

    it("расхождение введённого Vas с Mms даёт предупреждение", () => {
        const r = derive({
            ts: { ...base, vas: 45, mms: 50 },
            sources: { vas: { source: "datasheet" } },
        });
        const w = r.warnings.find((x) => x.field === "vas");
        expect(w).toBeDefined();
        expect(w?.removable).toContain("mms");
    });
});

describe("derive: недостающие данные", () => {
    it("перечисляет обязательные поля, которых нет", () => {
        const r = derive({
            ts: { fs: 32, qts: 0.4, vas: 45, sd: 340 },
            sources: {},
        });
        expect(r.missing).toEqual(["xmax"]);
    });

    it("не мутирует входной объект", () => {
        const input = { ts: { ...base, mms: 50 }, sources: {} };
        const snapshot = JSON.stringify(input);
        derive(input);
        expect(JSON.stringify(input)).toBe(snapshot);
    });
});