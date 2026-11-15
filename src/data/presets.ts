import { DEFAULT_DRIVER, JL_REFERENCE_DRIVER } from "./drivers";
import type { Driver } from "../core/types";
export const DRIVER_PRESETS: { name: string; driver: Driver }[] = [
    { name: "EDGE EDS15D1-E7", driver: DEFAULT_DRIVER },
    { name: "JL Audio 12W0v3-4", driver: JL_REFERENCE_DRIVER },
];
