import { useState, useRef, useEffect, useCallback } from 'react';
import { useBaseTetris } from './useBaseTetris';
import { TetrominoRandomizer, RandomizerType } from '../utils/randomizer';
import { getTetrominoByType } from '../utils/tetris';
import { useTetrisControls } from './useTetrisControl';
import { KeyMap } from '../types/settings';
import { Cell } from '../types/tetris';

export const useModernTetris = (keyMap: KeyMap, randomizerType: RandomizerType) => {
    const randomizerRef = useRef(new TetrominoRandomizer(randomizerType));

    // Modern preview queue of 4 pieces
    const [nextPieces, setNextPieces] = useState<Cell[]>(() => [
        randomizerRef.current.getNextPieceType(),
        randomizerRef.current.getNextPieceType(),
        randomizerRef.current.getNextPieceType(),
        randomizerRef.current.getNextPieceType()
    ]);
    const [holdPiece, setHoldPiece] = useState<Cell | null>(null);
    const [hasHeldThisTurn, setHasHeldThisTurn] = useState<boolean>(false);

    const nextPiecesRef = useRef(nextPieces);
    const holdPieceRef = useRef(holdPiece);
    const hasHeldThisTurnRef = useRef(hasHeldThisTurn);

    useEffect(() => {
        nextPiecesRef.current = nextPieces;
    }, [nextPieces]);

    useEffect(() => {
        holdPieceRef.current = holdPiece;
    }, [holdPiece]);

    useEffect(() => {
        hasHeldThisTurnRef.current = hasHeldThisTurn;
    }, [hasHeldThisTurn]);

    useEffect(() => {
        randomizerRef.current.setType(randomizerType);
    }, [randomizerType]);

    // Pull next piece and refill modern preview queue
    const getNextPiece = useCallback(() => {
        const nextType = nextPiecesRef.current[0];
        const newType = randomizerRef.current.getNextPieceType();
        setNextPieces([...nextPiecesRef.current.slice(1), newType]);
        return getTetrominoByType(nextType);
    }, []);

    const onLockDown = useCallback(() => {
        setHasHeldThisTurn(false);
    }, []);

    const base = useBaseTetris({
        onNextPiece: getNextPiece,
        onLockDown
    });

    const hold = useCallback(() => {
        if (base.isGameOver || base.isPaused) return;
        if (hasHeldThisTurnRef.current) return;

        const currentType = base.activePiece.type;

        if (holdPieceRef.current === null) {
            setHoldPiece(currentType);
            const nextType = nextPiecesRef.current[0];
            const newType = randomizerRef.current.getNextPieceType();
            setNextPieces([...nextPiecesRef.current.slice(1), newType]);
            base.setActivePiece(getTetrominoByType(nextType));
            base.incrementPieceCount(nextType as Exclude<Cell, 0>);
        } else {
            const prevHold = holdPieceRef.current;
            setHoldPiece(currentType);
            base.setActivePiece(getTetrominoByType(prevHold));
        }
        setHasHeldThisTurn(true);
    }, [base]);

    const restartGame = useCallback(() => {
        randomizerRef.current.reset();
        
        // Re-generate fresh queue and active piece
        const freshQueue = [
            randomizerRef.current.getNextPieceType(),
            randomizerRef.current.getNextPieceType(),
            randomizerRef.current.getNextPieceType(),
            randomizerRef.current.getNextPieceType()
        ];
        setNextPieces(freshQueue);
        
        const first = randomizerRef.current.getNextPieceType();
        base.restartBaseGame(getTetrominoByType(first));
        setHoldPiece(null);
        setHasHeldThisTurn(false);
    }, [base]);

    useTetrisControls({
        moveLeft: base.moveLeft,
        moveRight: base.moveRight,
        rotateCW: base.rotateCW,
        rotateCCW: base.rotateCCW,
        drop: base.drop,
        hardDrop: base.hardDrop,
        hold,
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
        nextPieces,
        holdPiece,
        hold,
        pieceCounts: base.pieceCounts
    };
};
