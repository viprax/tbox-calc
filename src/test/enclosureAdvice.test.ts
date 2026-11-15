import { describe, expect, it } from "vitest";
import { enclosureAdvice } from "../core/enclosureAdvice";
import { DEFAULT_DRIVER } from "../data/drivers";

describe("enclosure advice", () => {
    it("uses Fs/Qts as the requested screening ratio", () => {
        expect(enclosureAdvice(DEFAULT_DRIVER.ts).ratio).toBeCloseTo(32.3 / 0.28, 4);
        expect(enclosureAdvice(DEFAULT_DRIVER.ts).kind).toBe("ported");
    });
    it("keeps thresholds advisory and handles invalid Qts", () => {
        expect(enclosureAdvice({ fs: 30, qts: 0.75 }).kind).toBe("sealed");
        expect(enclosureAdvice({ fs: 30, qts: 0.4 }).kind).toBe("either");
        expect(enclosureAdvice({ fs: 30, qts: 0 }).kind).toBe("unknown");
    });
});
