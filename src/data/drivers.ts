import type { Driver, DriverSourceMap, DriverTS } from "../core/types";

export const DEFAULT_DRIVER_SOURCE_URL = "https://www.garmin.com.sg/products/audio/jl-12w0v3-4/";
export const JL_REFERENCE_NET_VOLUME_L = 38.94;

const ts: DriverTS = {
    fs: 28.43, qts: 0.670, qes: 0.715, qms: 10.709,
    vas: 71.64, sd: 481, xmax: 11.4, re: 4.280,
};
const sources: DriverSourceMap = Object.fromEntries(
    Object.keys(ts).map((key) => [key, {
        source: "datasheet", recordedAt: "2026-11-11", url: DEFAULT_DRIVER_SOURCE_URL,
        note: "JL Audio 12W0v3-4; раздел Parameters, значения для 12 дюймов",
    }]),
);

/** Именованный пример. Отсутствующие в источнике параметры не выдумываем. */
export const JL_REFERENCE_DRIVER: Driver = {
    spec: {
        name: "12W0v3-4", brand: "JL Audio", type: "subwoofer", diameterInch: 12,
        mountingDepthCm: 13.7, cutoutDiameterCm: 28.1, displacementL: 1.36,
        nominalImpedanceOhm: 4, powerRmsW: 300, sensitivityDb: 85.64,
    },
    ts, sources,
};

/** Рабочие данные EDGE приняты владельцем как близкие к реальным (~90%, субъективная оценка, не точность модели). Sd/Xmax — оценки; происхождение остальных полей сохранено в sources. */
export const DEFAULT_DRIVER: Driver = {
    spec: { name: "EDS15D1-E7", brand: "EDGE", type: "subwoofer", diameterInch: 15, mountingDepthCm: 24.5, cutoutDiameterCm: 37.5 },
    geometry: { cutoutDiameterMm: 375, magnetDiameterMm: 220, mountingDepthMm: 245, basketDepthMm: 145, magnetDepthMm: 115 },
    ts: { fs: 32.3, qts: 0.28, vas: 50.8, sd: 750, xmax: 20, qms: 3.55, qes: 0.304, re: 2, le: 0, bl: 22.4, mms: 380 },
    sources: Object.fromEntries(["fs", "qts", "vas", "sd", "xmax", "qms", "qes", "re", "le", "bl", "mms"].map((key) => [key, {
        source: "user", recordedAt: "2026-11-11",
        note: key === "sd" || key === "xmax" ? "Оценка владельца, уверенность около 90%" : "Владелец подтвердил происхождение с официальных сайтов; точная ссылка не сохранена",
    }])),
};
export const DEFAULT_NET_VOLUME_L = 20;
