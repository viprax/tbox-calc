import { assertPositive } from "./assert";

/** Проверка, помещается ли круглый вырез на прямоугольной лицевой панели. Единицы — мм. */
export function cutoutFitsPanel(diameterMm: number, panelWidthMm: number, panelHeightMm: number): boolean {
    assertPositive("diameterMm", diameterMm);
    assertPositive("panelWidthMm", panelWidthMm);
    assertPositive("panelHeightMm", panelHeightMm);
    return diameterMm <= panelWidthMm && diameterMm <= panelHeightMm;
}
