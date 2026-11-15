import { assertInRange, assertPositive } from "./assert";
import type { Dims } from "./boxDimensions";

export interface DriverInstallationInput {
    nominalDiameterInch?: number | null;
    frameDiameterMm?: number | null;
    cutoutDiameterMm?: number | null;
    mountingDepthMm?: number | null;
    rearClearanceMm?: number;
    /** From the left/top outer edges of the front panel. Undefined means preview only. */
    centerMm?: { x: number; y: number } | null;
}

function optionalDimension(name: string, value?: number | null): number | null {
    if (value == null || value === 0) return null;
    return assertPositive(name, value);
}

/** One installation envelope shared by 2D, 3D and the panel drawing. All units mm. */
export function driverInstallation(outer: Dims, wallMm: number, input: DriverInstallationInput) {
    for (const axis of ["w", "h", "d"] as const) assertPositive(`outer.${axis}`, outer[axis] - 2 * wallMm);
    assertPositive("wallMm", wallMm);
    const frame = optionalDimension("frameDiameterMm", input.frameDiameterMm);
    const nominal = optionalDimension("nominalDiameterInch", input.nominalDiameterInch);
    const frameDiameterMm = frame ?? (nominal === null ? null : nominal * 25.4);
    const frameEstimated = frame === null && frameDiameterMm !== null;
    const cutoutDiameterMm = optionalDimension("cutoutDiameterMm", input.cutoutDiameterMm);
    const mountingDepthMm = optionalDimension("mountingDepthMm", input.mountingDepthMm);
    const rearClearanceMm = assertInRange("rearClearanceMm", input.rearClearanceMm ?? 0, 0, Number.MAX_VALUE);
    const centerMm = input.centerMm ?? { x: outer.w / 2, y: outer.h / 2 };
    assertInRange("center.x", centerMm.x, 0, Number.MAX_VALUE);
    assertInRange("center.y", centerMm.y, 0, Number.MAX_VALUE);
    const circleFits = (diameter: number, inset: number) => {
        const radius = diameter / 2;
        return centerMm.x - radius >= inset - 1e-6 && centerMm.y - radius >= inset - 1e-6
            && centerMm.x + radius <= outer.w - inset + 1e-6 && centerMm.y + radius <= outer.h - inset + 1e-6;
    };
    const frameFits = frameDiameterMm === null ? null : circleFits(frameDiameterMm, 0);
    const cutoutFits = cutoutDiameterMm === null ? null : circleFits(cutoutDiameterMm, wallMm);
    const availableDepthMm = outer.d - wallMm; // measured from outer baffle face
    const rearGapMm = mountingDepthMm === null ? null : availableDepthMm - mountingDepthMm;
    const problems: string[] = [];
    const missing: string[] = [];
    if (frameFits === false) problems.push("Рама динамика выходит за края передней панели.");
    if (cutoutFits === false) problems.push("Вырез выходит за свободную область передней панели или пересекает соседние стенки.");
    if (frameDiameterMm !== null && cutoutDiameterMm !== null && cutoutDiameterMm > frameDiameterMm) problems.push("Диаметр выреза больше внешнего диаметра рамы.");
    if (rearGapMm !== null && rearGapMm < rearClearanceMm - 1e-6) problems.push(`За динамиком остаётся ${rearGapMm.toFixed(1)} мм при заданном зазоре ${rearClearanceMm} мм.`);
    if (frame === null) missing.push(frameEstimated ? "Внешний контур оценён по номинальному диаметру; укажите точный диаметр рамы для проверки посадки." : "Не задан внешний диаметр рамы динамика.");
    if (cutoutDiameterMm === null) missing.push("Не задан диаметр выреза.");
    if (mountingDepthMm === null) missing.push("Не задана глубина установки динамика.");
    if (input.centerMm == null) missing.push("Центр выреза не задан. На предварительном виде динамик показан по центру панели.");
    return { frameDiameterMm, frameEstimated, cutoutDiameterMm, mountingDepthMm, rearClearanceMm, centerMm, centerSpecified: input.centerMm != null, frameFits, cutoutFits, availableDepthMm, rearGapMm, problems, missing };
}

export type DriverInstallation = ReturnType<typeof driverInstallation>;
