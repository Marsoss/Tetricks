// ============================================================
// LevelSystem — Stateless level & gravity computation
// ============================================================

import { LevelConfig } from '../config/scoreConfig';

export class LevelSystem {
    private config: LevelConfig;
    /** Sorted list of levels that have entries in the gravity table */
    private gravityKeys: number[];

    constructor(config: LevelConfig) {
        this.config = config;
        this.gravityKeys = Object.keys(config.gravityTable)
            .map(Number)
            .sort((a, b) => a - b);
    }

    /**
     * Compute the current level from total lines cleared.
     */
    getLevel(totalLines: number): number {
        const level = Math.floor(totalLines / this.config.linesPerLevel) + 1;
        if (this.config.maxLevel !== undefined) {
            return Math.min(level, this.config.maxLevel);
        }
        return level;
    }

    /**
     * Get the gravity drop interval (in ms) for a given level.
     * Uses exact table lookup when available, otherwise falls back
     * to the nearest lower defined level.
     */
    getGravity(level: number): number {
        // Exact match
        if (this.config.gravityTable[level] !== undefined) {
            return this.config.gravityTable[level];
        }

        // Find the highest defined level ≤ current level
        for (let i = this.gravityKeys.length - 1; i >= 0; i--) {
            if (this.gravityKeys[i] <= level) {
                return this.config.gravityTable[this.gravityKeys[i]];
            }
        }

        // Fallback
        return 1000;
    }
}
