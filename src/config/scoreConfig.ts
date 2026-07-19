// ============================================================
// Score & Level Configuration Tables
// ============================================================
// Pure data — no logic. Add new variants here without touching
// LevelSystem or ScoreSystem.
// ============================================================


// ---- Type Definitions ----

export interface ScoreTable {
    /** Points for clearing 0–4 lines simultaneously */
    lineClear: [number, number, number, number, number];
    /** T-Spin base points (zero/single/double/triple) */
    tSpin: { zero: number; single: number; double: number; triple: number };
    /** T-Spin Mini base points */
    tSpinMini: { zero: number; single: number };
    /** Points per cell during soft drop */
    softDropPerCell: number;
    /** Points per cell during hard drop */
    hardDropPerCell: number;
    /** Points added per combo step: comboMultiplier × combo × level */
    comboMultiplier: number;
    /** Back-to-back multiplier (e.g. 1.5 = +50%) */
    backToBackMultiplier: number;
    /** Perfect clear bonus by lines cleared [0,1,2,3,4] */
    perfectClear: [number, number, number, number, number];
    /** Whether score formula is base × (level+1) (NES) or base × level (Guideline) */
    levelMultiplierStyle: 'nes' | 'guideline';
}

export interface LevelConfig {
    /** Lines required to advance one level */
    linesPerLevel: number;
    /** Level → drop interval in ms. Missing keys use nearest lower entry. */
    gravityTable: Record<number, number>;
    /** Optional max level cap */
    maxLevel?: number;
}

export interface RuleSetFeatures {
    hasHold: boolean;
    hasWallKicks: boolean;
    hasTSpins: boolean;
    hasBackToBack: boolean;
    hasCombos: boolean;
    hasGhostPiece: boolean;
    hasSoftDropScore: boolean;
    hasHardDropScore: boolean;
    /** Number of preview pieces shown (1 for NES, 4+ for modern) */
    previewCount: number;
}

export interface RuleSetConfig {
    name: string;
    score: ScoreTable;
    level: LevelConfig;
    features: RuleSetFeatures;
}

// ---- Classic NES Configuration ----

export const CLASSIC_NES_CONFIG: RuleSetConfig = {
    name: 'Classic NES',
    score: {
        lineClear: [0, 40, 100, 300, 1200],
        tSpin: { zero: 0, single: 0, double: 0, triple: 0 },
        tSpinMini: { zero: 0, single: 0 },
        softDropPerCell: 0,
        hardDropPerCell: 0,
        comboMultiplier: 0,
        backToBackMultiplier: 1.0,  // No back-to-back
        perfectClear: [0, 0, 0, 0, 0],
        levelMultiplierStyle: 'nes',
    },
    level: {
        linesPerLevel: 10,
        gravityTable: {
            1:  800,  // 48 frames @ 60fps
            2:  717,  // 43 frames
            3:  633,  // 38 frames
            4:  550,  // 33 frames
            5:  467,  // 28 frames
            6:  383,  // 23 frames
            7:  300,  // 18 frames
            8:  217,  // 13 frames
            9:  133,  //  8 frames
            10: 100,  //  6 frames
            11:  83,  //  5 frames
            14:  67,  //  4 frames
            17:  50,  //  3 frames
            20:  33,  //  2 frames
            30:  17,  //  1 frame (Kill screen)
        },
    },
    features: {
        hasHold: false,
        hasWallKicks: false,
        hasTSpins: false,
        hasBackToBack: false,
        hasCombos: false,
        hasGhostPiece: false,
        hasSoftDropScore: false,
        hasHardDropScore: false,
        previewCount: 1,
    },
};

// ---- Modern Guideline Configuration ----

export const MODERN_GUIDELINE_CONFIG: RuleSetConfig = {
    name: 'Modern Guideline',
    score: {
        lineClear: [0, 100, 300, 500, 800],
        tSpin: { zero: 400, single: 800, double: 1200, triple: 1600 },
        tSpinMini: { zero: 100, single: 200 },
        softDropPerCell: 1,
        hardDropPerCell: 2,
        comboMultiplier: 50,
        backToBackMultiplier: 1.5,
        perfectClear: [0, 800, 1200, 1800, 2000],
        levelMultiplierStyle: 'guideline',
    },
    level: {
        linesPerLevel: 10,
        // Guideline uses a formula: max(50, 1000 × 0.9^(level-1))
        // We pre-compute the first 30 levels for table lookup.
        gravityTable: Object.fromEntries(
            Array.from({ length: 30 }, (_, i) => [
                i + 1,
                Math.max(50, Math.round(1000 * Math.pow(0.9, i)))
            ])
        ),
    },
    features: {
        hasHold: true,
        hasWallKicks: true,
        hasTSpins: true,
        hasBackToBack: true,
        hasCombos: true,
        hasGhostPiece: true,
        hasSoftDropScore: true,
        hasHardDropScore: true,
        previewCount: 4,
    },
};

// ---- Helper: pick config from mode string ----

export function getRuleSetConfig(mode: 'classic' | 'modern'): RuleSetConfig {
    return mode === 'modern' ? MODERN_GUIDELINE_CONFIG : CLASSIC_NES_CONFIG;
}
