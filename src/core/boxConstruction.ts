import { assertPositive, InvalidInputError } from "./assert";
import { MATERIALS, type BoxDimensionsResult, type Dims, type MaterialKey } from "./boxDimensions";

/** Keep mm precision for fixed dimensions; do not round visual geometry separately. */
export function dimensionsMm(cm: Dims): Dims {
    return { w: Math.round(cm.w * 10), h: Math.round(cm.h * 10), d: Math.round(cm.d * 10) };
}

export interface BoxPanel {
    name: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
    joint: string;
}

/** Full-size front/rear caps; full-height sides between caps; top/bottom between sides. */
export function boxPanels(box: BoxDimensionsResult, material: MaterialKey) {
    const thicknessMm = MATERIALS[material].thicknessMm;
    const outer = dimensionsMm(box.outerCm);
    const inner = dimensionsMm(box.innerCm);
    for (const axis of ["w", "h", "d"] as const) {
        assertPositive(`inner.${axis}`, inner[axis]);
        assertPositive(`outer.${axis}`, outer[axis]);
        if (Math.abs(outer[axis] - inner[axis] - 2 * thicknessMm) > 1e-6) {
            throw new InvalidInputError("Размеры панелей не согласованы с толщиной материала");
        }
    }
    const panels: BoxPanel[] = [
        { name: "Передняя и задняя", quantity: 2, widthMm: outer.w, heightMm: outer.h, joint: "Накладные; закрывают торцы четырёх стенок" },
        { name: "Левая и правая", quantity: 2, widthMm: inner.d, heightMm: outer.h, joint: "Между передней и задней, во всю высоту" },
        { name: "Верх и низ", quantity: 2, widthMm: inner.w, heightMm: inner.d, joint: "Между боковинами, передней и задней" },
    ];
    return { panels, thicknessMm, inner, outer };
}
