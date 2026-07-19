// ============================================================
// ScoreSystem — Stateful score computation with event processing
// ============================================================

import { ScoreTable, RuleSetFeatures } from '../config/scoreConfig';

/**
 * Game events that the ScoreSystem can process.
 */
export interface ScoreEvent {
    type: 'LINE_CLEAR' | 'SOFT_DROP' | 'HARD_DROP';
    linesCleared?: number;
    cellsDropped?: number;
    isTSpin?: boolean;
    isTSpinMini?: boolean;
    isPerfectClear?: boolean;
}

/**
 * Result returned by processEvent() with details about what happened.
 */
export interface ScoreResult {
    pointsAwarded: number;
    comboCounter: number;
    backToBackActive: boolean;
    wasBackToBack: boolean;
    comboBonus: number;
}

/**
 * Stateful scoring engine driven by a ScoreTable and feature flags.
 * Tracks combo counter and back-to-back state across events.
 */
export class ScoreSystem {
    public score: number = 0;
    public comboCounter: number = -1;   // -1 = no active combo
    public backToBackActive: boolean = false;

    constructor(
        private scoreTable: ScoreTable,
        private features: RuleSetFeatures
    ) {}

    /**
     * Process a single game event and return the points awarded.
     */
    processEvent(event: ScoreEvent, level: number): ScoreResult {
        let pointsAwarded = 0;
        let wasBackToBack = false;
        let comboBonus = 0;

        const levelMul = this.scoreTable.levelMultiplierStyle === 'nes'
            ? (level + 1)
            : level;

        switch (event.type) {
            case 'LINE_CLEAR': {
                const lines = Math.min(event.linesCleared ?? 0, 4);

                if (lines === 0) {
                    // No lines cleared — reset combo
                    this.comboCounter = -1;
                    break;
                }

                // Base line clear points
                let basePoints: number;

                if (event.isTSpin && this.features.hasTSpins) {
                    // T-Spin line clear
                    const tSpinLookup: Record<number, number> = {
                        0: this.scoreTable.tSpin.zero,
                        1: this.scoreTable.tSpin.single,
                        2: this.scoreTable.tSpin.double,
                        3: this.scoreTable.tSpin.triple,
                    };
                    basePoints = (tSpinLookup[lines] ?? 0) * levelMul;
                } else if (event.isTSpinMini && this.features.hasTSpins) {
                    // T-Spin Mini
                    const miniLookup: Record<number, number> = {
                        0: this.scoreTable.tSpinMini.zero,
                        1: this.scoreTable.tSpinMini.single,
                    };
                    basePoints = (miniLookup[lines] ?? 0) * levelMul;
                } else {
                    // Standard line clear
                    basePoints = this.scoreTable.lineClear[lines] * levelMul;
                }

                // Back-to-Back check (applies to Tetris and T-Spins)
                const isBackToBackEligible = lines === 4 || event.isTSpin || event.isTSpinMini;

                if (this.features.hasBackToBack && isBackToBackEligible) {
                    if (this.backToBackActive) {
                        // Apply back-to-back multiplier
                        basePoints = Math.floor(basePoints * this.scoreTable.backToBackMultiplier);
                        wasBackToBack = true;
                    }
                    this.backToBackActive = true;
                } else if (this.features.hasBackToBack && lines > 0) {
                    // Non-eligible line clear breaks back-to-back chain
                    this.backToBackActive = false;
                }

                pointsAwarded += basePoints;

                // Combo system
                if (this.features.hasCombos) {
                    this.comboCounter++;
                    if (this.comboCounter > 0) {
                        comboBonus = this.scoreTable.comboMultiplier * this.comboCounter * levelMul;
                        pointsAwarded += comboBonus;
                    }
                }

                // Perfect clear bonus
                if (event.isPerfectClear && this.features.hasSoftDropScore) {
                    pointsAwarded += this.scoreTable.perfectClear[lines] * levelMul;
                }

                break;
            }

            case 'SOFT_DROP': {
                if (this.features.hasSoftDropScore) {
                    pointsAwarded = (event.cellsDropped ?? 0) * this.scoreTable.softDropPerCell;
                }
                break;
            }

            case 'HARD_DROP': {
                if (this.features.hasHardDropScore) {
                    pointsAwarded = (event.cellsDropped ?? 0) * this.scoreTable.hardDropPerCell;
                }
                break;
            }
        }

        this.score += pointsAwarded;

        return {
            pointsAwarded,
            comboCounter: this.comboCounter,
            backToBackActive: this.backToBackActive,
            wasBackToBack,
            comboBonus,
        };
    }

    /**
     * Reset all scoring state for a new game.
     */
    reset(): void {
        this.score = 0;
        this.comboCounter = -1;
        this.backToBackActive = false;
    }
}
