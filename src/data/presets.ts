import type { DriverTS } from "../core/types";

export const DRIVER_PRESETS: { name: string; description: string; driver: DriverTS; diameterInch?: number }[] = [
    { name: "Пример Edge EDS15D1-E7", description: "Данные из текущего примера; часть параметров условная", diameterInch: 15, driver: { fs: 32.3, qts: 0.28, vas: 50.8, sd: 750, xmax: 20, qms: 3.55, qes: 0.304, re: 2, le: 0, bl: 22.4, mms: 380 } },
];
