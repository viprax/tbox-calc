import { closedBox } from "./closedBox";
import type { BoxDimensionsInput } from "./boxDimensions";
import { solveBoxDimensions } from "./boxDimensions";
import type { DriverTS, DriverType } from "./types";
import { checkClosedBox, type BoxWarning } from "./warnings";

export interface ClosedBoxCalculationInput {
    ts: DriverTS;
    dimensions: BoxDimensionsInput;
    type?: DriverType;
}

export interface ClosedBoxCalculation {
    dimensions: ReturnType<typeof solveBoxDimensions>;
    response: ReturnType<typeof closedBox>;
    warnings: BoxWarning[];
}

/** Связывает геометрию, фактический объём, АЧХ и предупреждения одним расчётом. */
export function calculateClosedBox(input: ClosedBoxCalculationInput): ClosedBoxCalculation {
    const dimensions = solveBoxDimensions(input.dimensions);
    const actualVolumeL = dimensions.volumeL;
    const response = closedBox(input.ts, actualVolumeL);
    const warnings = checkClosedBox({
        ts: input.ts,
        vb: actualVolumeL,
        box: response,
        type: input.type ?? "subwoofer",
    });

    return { dimensions, response, warnings };
}
