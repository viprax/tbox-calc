export interface PortedReferencePoint {
    f: number;
    db: number;
}

export interface PortedReference {
    id: string;
    label: string;
    vbL: number;
    fbHz: number;
    f3Hz: number;
    ql: number;
    points: PortedReferencePoint[];
}

/** Cursor readings supplied by the user from JBL SpeakerShop, without cabin gain. */
export const PORTED_REFERENCES: PortedReference[] = [
    {
        id: "190-30",
        label: "JBL SpeakerShop · 190 л / 30 Гц",
        vbL: 190,
        fbHz: 30,
        f3Hz: 26.7,
        ql: 10,
        points: [
            { db: -3.6, f: 60 }, { db: -3.7, f: 55.2 }, { db: -3.6, f: 50 },
            { db: -3.2, f: 44.8 }, { db: -2.4, f: 40 }, { db: 0, f: 35 },
            { db: 1.4, f: 33.2 }, { db: 2.1, f: 32.4 }, { db: 2.9, f: 31.1 },
            { db: 3, f: 30 }, { db: 2, f: 29.2 }, { db: 0.2, f: 28 },
            { db: -4.8, f: 25.9 }, { db: -7.1, f: 24.9 }, { db: -11.2, f: 23.1 },
            { db: -17.5, f: 20 },
        ],
    },
    {
        id: "80-40",
        label: "JBL SpeakerShop · 80 л / 40 Гц",
        vbL: 80,
        fbHz: 40,
        f3Hz: 34.87741,
        ql: 10,
        points: [
            { db: -1, f: 60 }, { db: -0.3, f: 55.2 }, { db: 0.7, f: 50 },
            { db: 2.7, f: 44.8 }, { db: 3.5, f: 42 }, { db: 3.1, f: 40 },
            { db: -2.8, f: 35 }, { db: -5.5, f: 33.2 }, { db: -6.7, f: 32.4 },
            { db: -8.5, f: 31.1 }, { db: -10.3, f: 30 }, { db: -11.4, f: 29.2 },
            { db: -13, f: 28 }, { db: -16, f: 25.9 }, { db: -17.4, f: 24.9 },
            { db: -20.2, f: 23.1 }, { db: -25, f: 20 },
        ],
    },
];
