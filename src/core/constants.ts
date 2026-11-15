/** Все пороги, допуски и справочные значения проекта. Меняются здесь, а не в коде функций. */

// Единицы и физика
export const SOUND_SPEED_CM_S = 34300;      // скорость звука, см/с (~20 °C)
export const AIR_DENSITY_KG_M3 = 1.2;       // плотность воздуха, кг/м³ (~20 °C)
export const SPEED_OF_SOUND_M_S = 343;      // скорость звука, м/с (для derive)

// Порт
export const END_CORRECTION_FACTOR = 1.46;   // 0.85r у щита + 0.61r на свободном конце; только круглый порт
export const PORT_VELOCITY_WARN_MS = 17;    // ориентировочный порог шума, не гарантия
export const PORT_MIN_LENGTH_CM = 2;        // эвристический порог для проверки геометрии

// Закрытый ящик и предупреждения
export const QTC_OVERDAMPED_BELOW = 0.5;
export const QTC_OK_MAX = 0.75;
export const QTC_PEAKY_MAX = 0.9;
export const VB_MIN_L = 1;
export const VB_MAX_L = 200;
export const XMAX_SUB_MIN_MM = 5;
export const DEFAULT_CROSSOVER_HZ = 80;

// Расчёт недостающих данных
export const DEFAULT_TOLERANCE = 0.1;       // допуск расхождения, 10 %


// Размеры короба
export const VOLUME_TOLERANCE = 0.005;      // допуск объёма, 0.5 %