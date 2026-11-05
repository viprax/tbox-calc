
export type DriverType = "subwoofer" | "midbass" | "midrange" | "tweeter" | "fullrange";

export interface ImpedancePoint {
    f: number;
    z: number;
}

export interface DriverSpec {
    name: string;
    brand?: string;
    type: DriverType;
    diameterInch?: number;
    mountingDepthCm?: number;
    cutoutDiameterCm?: number;
    sensitivityDb?: number;
    nominalImpedanceOhm?: number;
    powerRmsW?: number;
    powerPeakW?: number;
    voiceCoilDiameterMm?: number;
    voiceCoilHeightMm?: number;
    voiceCoilFormer?: string;
    impedanceCurve?: ImpedancePoint[];
}

export interface DriverTS {
    fs: number;
    qts: number;
    qms?: number;
    qes?: number;
    vas: number;
    sd: number;
    xmax: number;
    re?: number;
    le?: number;
    bl?: number;
    mms?: number;
}

export type ValueSource = "datasheet" | "measured" | "derived" | "user" | "winisd" | (string & {});

export interface FieldMeta {
    source: ValueSource;
    recordeAt?: string;
    note?: string;
}

export type DriverSourceMap = Partial<Record<keyof DriverTS, FieldMeta>>;

export interface Driver {
    spec: DriverSpec;
    ts: DriverTS;
    sources: DriverSourceMap;
}

export interface DeriveWarning {
    field: keyof DriverTS;
    kind: "conflict";
    message: string;
    removable: (keyof DriverTS)[];
}

export interface DeriveResult {
    ts: Partial<DriverTS>;
    sources: DriverSourceMap;
    derived: (keyof DriverTS)[];
    missing: (keyof DriverTS)[];
    warnings: DeriveWarning[];
}

export interface ClosedBox {
    alpha: number;
    fc: number;
    qtc: number;
    f3: number;
    peakDb: number;
}