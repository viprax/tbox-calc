import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClosedBox3D } from "../components/ClosedBox3D";
import { driverInstallation } from "../core/driverInstallation";

it("explains why the mounted driver cannot be shown without a known baffle opening", () => {
    const installation = driverInstallation({ w: 450, h: 450, d: 300 }, 18, { frameDiameterMm: 400, mountingDepthMm: 245 });
    const html = renderToStaticMarkup(createElement(ClosedBox3D, { outerCm: { w: 45, h: 45, d: 30 }, material: "plywood", installation, magnetDiameterMm: 220, magnetDepthMm: 115 }));
    expect(html).toContain("Динамик не показан: задайте диаметр выреза");
});

describe("invalid scene dimensions", () => {
    it.each([0, -1, NaN, Infinity, 3.6])("does not mount the interactive scene for width %s", (w) => {
        const installation = driverInstallation({ w: 450, h: 450, d: 300 }, 18, {});
        const html = renderToStaticMarkup(createElement(ClosedBox3D, { outerCm: { w, h: 45, d: 30 }, material: "plywood", installation, magnetDiameterMm: 0, magnetDepthMm: 0 }));
        expect(html).toContain('role="alert"');
        expect(html).not.toContain("Скрыть динамик");
    });
});
