import { describe, expect, it } from "vitest";
import { portedF3Hz, portedResponseDb, type PortedParams } from "../../core/portedResponse";
import { PORTED_REFERENCES } from "../../data/portedReferences";
import { parseReference } from "../../core/portedReference";
const p: PortedParams = { fs: 32.3, qts: 0.28, vas: 50.8, vb: 190, fb: 30, ql: 10 };
describe("parseReference: формат SpeakerShop", () => {
    it("разбирает уровни слева от косой черты и запятые в десятичных числах", () => {
        expect(parseReference("-1,0 / 60\n-0,3 / 55,2\n0,7 / 50"))
            .toEqual([{ f: 50, db: 0.7 }, { f: 55.2, db: -0.3 }, { f: 60, db: -1 }]);
    });
});

describe("portedResponseDb: сверка с JBL SpeakerShop", () => {
    for (const reference of PORTED_REFERENCES) {
        const params: PortedParams = {
            fs: p.fs,
            qts: p.qts,
            vas: p.vas,
            vb: reference.vbL,
            fb: reference.fbHz,
            ql: reference.ql,
        };

        it(`${reference.vbL} л / ${reference.fbHz} Гц: все точки отличаются не больше чем на 0.5 дБ`, () => {
            for (const point of reference.points) {
                expect(Math.abs(portedResponseDb(point.f, params) - point.db)).toBeLessThan(0.5);
            }
        });

        it(`${reference.vbL} л / ${reference.fbHz} Гц: RMS расхождение меньше 0.25 дБ`, () => {
            const squaredError = reference.points.reduce(
                (sum, point) => sum + (portedResponseDb(point.f, params) - point.db) ** 2,
                0,
            );
            expect(Math.sqrt(squaredError / reference.points.length)).toBeLessThan(0.25);
        });

        it(`${reference.vbL} л / ${reference.fbHz} Гц: F3 совпадает с JBL SpeakerShop`, () => {
            expect(portedF3Hz(params)).toBeCloseTo(reference.f3Hz, reference.id === "190-30" ? 1 : 2);
        });
    }
});

describe("portedF3Hz: настройка мастера", () => {
    it("при Vb 130 л, Fb 30 Гц и Ql 7 даёт F3 около 27.5 Гц", () => {
        expect(portedF3Hz({ fs: 32.3, qts: 0.28, vas: 50.8, vb: 130, fb: 30, ql: 7 })).toBeCloseTo(27.5, 1);
    });
});
