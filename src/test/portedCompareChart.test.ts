import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PortedCompareChart } from "../components/PortedCompareCharts";

describe("saved reference driver identity", () => {
    it("shows only the calculated response in the normal calculator", () => {
        const html = renderToStaticMarkup(createElement(PortedCompareChart, { params: { fs: 32.3, qts: 0.28, vas: 50.8, vb: 190, fb: 30, ql: 10 } }));
        expect(html).not.toContain("<textarea");
        expect(html).not.toContain("<circle");
        expect(html).not.toContain("RMS");
        expect(html).toContain("<path");
    });
    it("does not attach the owner's EDGE reference points to a different driver", () => {
        const html = renderToStaticMarkup(createElement(PortedCompareChart, { debug: true, params: { fs: 28.43, qts: 0.67, vas: 71.64, vb: 190, fb: 30, ql: 10 } }));
        expect(html).not.toContain("JBL SpeakerShop · 190 л / 30 Гц");
        expect(html).not.toContain("16 точек");
    });
});
