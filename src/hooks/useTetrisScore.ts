import { useState, useCallback, useMemo, useRef } from 'react';
import { RuleSetConfig, CLASSIC_NES_CONFIG } from '../config/scoreConfig';
import { LevelSystem } from '../systems/levelSystem';
import { ScoreSystem, ScoreEvent, ScoreResult } from '../systems/scoreSystem';

export interface TetrisScoreState {
    score: number;
    lines: number;
    level: number;
    comboCounter: number;
    backToBackActive: boolean;
}

/**
 * React hook managing Tetris score, level, combo, and back-to-back state.
 * Accepts an optional RuleSetConfig to drive scoring and leveling behavior.
 * Falls back to CLASSIC_NES_CONFIG if none is provided (backward compat).
 */
export const useTetrisScore = (ruleSetConfig?: RuleSetConfig) => {
    const config = ruleSetConfig ?? CLASSIC_NES_CONFIG;

    const [score, setScore] = useState<number>(0);
    const [lines, setLines] = useState<number>(0);
    const [level, setLevel] = useState<number>(1);
    const [comboCounter, setComboCounter] = useState<number>(-1);
    const [backToBackActive, setBackToBackActive] = useState<boolean>(false);

    const levelSystem = useMemo(() => new LevelSystem(config.level), [config]);
    const scoreSystemRef = useRef(new ScoreSystem(config.score, config.features));

    // Re-create ScoreSystem when config changes
    const prevConfigRef = useRef(config);
    if (prevConfigRef.current !== config) {
        scoreSystemRef.current = new ScoreSystem(config.score, config.features);
        prevConfigRef.current = config;
    }

    /**
     * Process a game event (line clear, soft drop, hard drop).
     * Updates score, lines, level, combo, and back-to-back state.
     */
    const processGameEvent = useCallback((event: ScoreEvent): ScoreResult => {
        const currentLevel = level;
        const result = scoreSystemRef.current.processEvent(event, currentLevel);

        if (result.pointsAwarded > 0) {
            setScore(scoreSystemRef.current.score);
        }

        setComboCounter(result.comboCounter);
        setBackToBackActive(result.backToBackActive);

        // Update lines and level for line clears
        if (event.type === 'LINE_CLEAR' && (event.linesCleared ?? 0) > 0) {
            setLines(prev => {
                const newLines = prev + (event.linesCleared ?? 0);
                const newLevel = levelSystem.getLevel(newLines);
                setLevel(newLevel);
                return newLines;
            });
        }

        return result;
    }, [level, levelSystem]);

    /**
     * Legacy compatibility: simple updateScore(linesCleared) interface.
     * Internally delegates to processGameEvent with a LINE_CLEAR event.
     */
    const updateScore = useCallback((linesCleared: number) => {
        if (linesCleared === 0) return;
        processGameEvent({
            type: 'LINE_CLEAR',
            linesCleared,
        });
    }, [processGameEvent]);

    /**
     * Reset all scoring state for a new game.
     */
    const resetScore = useCallback(() => {
        setScore(0);
        setLines(0);
        setLevel(1);
        setComboCounter(-1);
        setBackToBackActive(false);
        scoreSystemRef.current.reset();
    }, []);

    /**
     * Get gravity (drop interval ms) for the current level.
     */
    const getGravity = useCallback((lvl: number): number => {
        return levelSystem.getGravity(lvl);
    }, [levelSystem]);

    return {
        score,
        lines,
        level,
        comboCounter,
        backToBackActive,
        updateScore,
        processGameEvent,
        resetScore,
        getGravity,
    };
};