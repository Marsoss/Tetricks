import { useState, useRef, useEffect, useCallback } from 'react';
import { useBaseTetris } from './useBaseTetris';
import { TetrominoRandomizer, RandomizerType } from '../utils/randomizer';
import { getTetrominoByType } from '../utils/tetris';
import { useTetrisControls } from './useTetrisControl';
import { KeyMap } from '../types/settings';
import { Cell } from '../types/tetris';

export const useClassicTetris = (keyMap: KeyMap, randomizerType: RandomizerType) => {
    const randomizerRef = useRef(new TetrominoRandomizer(randomizerType));

    // Preview state of the next piece
    const [nextPiece, setNextPiece] = useState<Cell>(() => randomizerRef.current.getNextPieceType());
    const nextPieceRef = useRef(nextPiece);

    useEffect(() => {
        nextPieceRef.current = nextPiece;
    }, [nextPiece]);

    useEffect(() => {
        randomizerRef.current.setType(randomizerType);
    }, [randomizerType]);

    // Pull next piece and refill single preview
    const getNextPiece = useCallback(() => {
        const currentNext = nextPieceRef.current;
        const newNext = randomizerRef.current.getNextPieceType();
        setNextPiece(newNext);
        return getTetrominoByType(currentNext);
    }, []);

    const base = useBaseTetris({
        onNextPiece: getNextPiece
    });

    const restartGame = useCallback(() => {
        randomizerRef.current.reset();
        const first = randomizerRef.current.getNextPieceType();
        const second = randomizerRef.current.getNextPieceType();
        setNextPiece(second);
        base.restartBaseGame(getTetrominoByType(first));
    }, [base]);

    useTetrisControls({
        moveLeft: base.moveLeft,
        moveRight: base.moveRight,
        rotateCW: base.rotateCW,
        rotateCCW: base.rotateCCW,
        drop: base.drop,
        hardDrop: base.hardDrop,
        hold: () => {}, // hold is a no-op in classic mode
        isGameOver: base.isGameOver,
        isPaused: base.isPaused,
        togglePause: base.togglePause,
        keyMap
    });

    return {
        grid: base.grid,
        activePiece: base.activePiece,
        ghostY: base.ghostY,
        isGameOver: base.isGameOver,
        isPaused: base.isPaused,
        score: base.score,
        lines: base.lines,
        level: base.level,
        togglePause: base.togglePause,
        restartGame,
        nextPieces: [nextPiece] as Cell[],
        pieceCounts: base.pieceCounts
    };
};
