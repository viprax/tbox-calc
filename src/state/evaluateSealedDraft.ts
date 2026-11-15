import { MATERIALS, type Dims } from "../core/boxDimensions";
import { dimensionsMm } from "../core/boxConstruction";
import { calculateClosedBox, type ClosedBoxCalculation } from "../core/closedBoxCalculation";
import { driverInstallation, type DriverInstallation } from "../core/driverInstallation";
import { VOLUME_TOLERANCE } from "../core/constants";
import type { SealedBoxDraft } from "./sealedDraft";

const axes = { w: "Ширина", h: "Высота", d: "Глубина" } as const;
const positive = (label: string, value: number) => !Number.isFinite(value) ? `${label}: введите число.` : value <= 0 ? `${label}: значение должно быть больше нуля.` : null;
const nonnegative = (label: string, value: number) => !Number.isFinite(value) ? `${label}: введите число.` : value < 0 ? `${label}: значение не может быть отрицательным.` : null;
const cm = (mm: Dims): Dims => ({ w: mm.w / 10, h: mm.h / 10, d: mm.d / 10 });

/** UI mode/view do not participate in this selector or any physical calculation. */
export function evaluateSealedDraft(draft: SealedBoxDraft) {
    const errors: Record<string, string> = {};
    const check = (key: string, message: string | null) => { if (message) errors[key] = message; };
    check("fs", positive("Fs", draft.ts.fs)); check("qts", positive("Qts", draft.ts.qts));
    check("vas", positive("Vas", draft.ts.vas)); check("vb", positive("Целевой объём", draft.vb));
    check("depth", nonnegative("Глубина установки", draft.driverDepthMm));
    check("displacement", draft.driverDisplacementL === null ? null : nonnegative("Вытеснение динамика", draft.driverDisplacementL));
    check("braces", nonnegative("Объём внутренних деталей", draft.bracesDisplacementL));
    check("frontClearance", nonnegative("Запас панели", draft.frontClearanceMm));
    check("rearClearance", nonnegative("Зазор за динамиком", draft.rearClearanceMm));
    for (const [key, label, value] of [["nominal", "Номинальный диаметр", draft.nominalDiameterInch], ["frame", "Диаметр рамы", draft.frameDiameterMm], ["cutout", "Диаметр выреза", draft.cutoutDiameterMm]] as const) check(key, value === null ? null : positive(label, value));
    const wall = MATERIALS[draft.material].thicknessMm;
    for (const axis of ["w", "h", "d"] as const) {
        if (draft.customDims) check(`dim${axis}`, positive(`${axes[axis]} внутри`, draft.dimsMm[axis]) ?? (draft.dimsMm[axis] < 1 ? `${axes[axis]} внутри: минимум 1 мм.` : null));
        if (draft.limitsEnabled) check(`limit${axis}`, positive(`Предел: ${axes[axis].toLowerCase()}`, draft.limitsMm[axis]) ?? (draft.limitsMm[axis] < 2 * wall + 1 ? `Габарит ${axes[axis].toLowerCase()} должен быть не меньше ${2 * wall + 1} мм с учётом стенок.` : null));
    }
    if (draft.driverCenterMm !== null) {
        check("centerX", nonnegative("Центр выреза X", draft.driverCenterMm.x));
        check("centerY", nonnegative("Центр выреза Y", draft.driverCenterMm.y));
    }
    if (draft.cabin.enabled) {
        check("cabinCenter", positive("Центр поправки салона", draft.cabin.centerHz));
        check("cabinWidth", positive("Ширина поправки салона", draft.cabin.widthOct));
        check("cabinBoost", Number.isFinite(draft.cabin.boostDb) ? null : "Подъём салона: введите число.");
    }
    const driverDisplacement = draft.driverDisplacementL ?? 0;
    const netVolumeKnown = Number.isFinite(driverDisplacement) && driverDisplacement > 0;
    const frame = draft.frameDiameterMm ?? (draft.nominalDiameterInch === null ? null : draft.nominalDiameterInch * 25.4);
    const diameters = [frame, draft.cutoutDiameterMm].filter((v): v is number => v !== null);
    const minFrontOuterMm = diameters.length === 0 ? undefined : Math.max(Math.max(...diameters) + 2 * draft.frontClearanceMm, (draft.cutoutDiameterMm ?? 0) + 2 * wall);
    const minimumGrossCandidate = minFrontOuterMm !== undefined && draft.driverDepthMm > 0
        ? (minFrontOuterMm - 2 * wall) ** 2 * Math.max(1, draft.driverDepthMm + draft.rearClearanceMm - wall) / 1e6 : null;
    const minimumGrossL = minimumGrossCandidate !== null && Number.isFinite(minimumGrossCandidate) ? minimumGrossCandidate : null;
    let calculation: ClosedBoxCalculation | null = null;
    let installation: DriverInstallation | null = null;
    let error: string | null = null;
    // Invalid centre blocks only installation drawings, not valid acoustic inputs.
    const blocking = Object.keys(errors).filter(key => !key.startsWith("center") && !key.startsWith("cabin"));
    if (blocking.length === 0) {
        try {
            calculation = calculateClosedBox({ ts: draft.ts, ql: draft.ql, type: "subwoofer", dimensions: {
                vbNetL: draft.vb, material: draft.material,
                dmCm: (draft.driverDepthMm + draft.rearClearanceMm) / 10,
                displacementL: driverDisplacement + draft.bracesDisplacementL,
                ...(minFrontOuterMm === undefined ? {} : { minFrontOuterMm }),
                ...(draft.customDims ? { fixedInnerCm: cm(draft.dimsMm) } : {}),
                ...(draft.limitsEnabled ? { maxOuterCm: cm(draft.limitsMm) } : {}),
            } });
            if (!errors.centerX && !errors.centerY) installation = driverInstallation(dimensionsMm(calculation.dimensions.outerCm), wall, {
                nominalDiameterInch: draft.nominalDiameterInch, frameDiameterMm: draft.frameDiameterMm,
                cutoutDiameterMm: draft.cutoutDiameterMm, mountingDepthMm: draft.driverDepthMm,
                rearClearanceMm: draft.rearClearanceMm, centerMm: draft.driverCenterMm,
            });
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "";
            error = message.startsWith("Вытеснение") ? message : "Не удалось рассчитать корпус. Проверьте размеры, параметры и единицы: слишком большие или малые значения не поддерживаются.";
            calculation = null; installation = null;
        }
    }
    const targetMatches = calculation !== null && Math.abs(calculation.dimensions.errorL) / draft.vb <= VOLUME_TOLERANCE;
    return { calculation, installation, errors, error, netVolumeKnown, targetMatches, minimumGrossL };
}

export type ReturnTypeOfSealedEvaluation = ReturnType<typeof evaluateSealedDraft>;
