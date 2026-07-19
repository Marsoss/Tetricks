import { useState, useEffect, useCallback, useRef } from 'react';
import { createEmptyGrid } from '../utils/tetris';
import { ActivePiece, Grid, Cell } from '../types/tetris';
import { hasCollision, mergePieceIntoGrid, clearLines, checkGameOver, rotatePiece, movePieceBy } from '../utils/tetrisLogic';
import { useTetrisScore } from './useTetrisScore';

interface BaseTetrisProps {
    onNextPiece: () => ActivePiece;
    onLockDown?: () => void;
    onReset?: () => void;
}

export const useBaseTetris = ({ onNextPiece, onLockDown, onReset }: BaseTetrisProps) => {
    const [grid, setGrid] = useState<Grid>(() => createEmptyGrid());
    const [activePiece, setActivePiece] = useState<ActivePiece>(() => onNextPiece());
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [pieceCounts, setPieceCounts] = useState<Record<Exclude<Cell, 0>, number>>({
        I: 0,
        O: 0,
        T: 0,
        S: 0,
        Z: 0,
        J: 0,
        L: 0
    });

    const { score, lines, level, updateScore, resetScore } = useTetrisScore();

    const incrementPieceCount = useCallback((type: Exclude<Cell, 0>) => {
        setPieceCounts(prev => ({
            ...prev,
            [type]: (prev[type] || 0) + 1
        }));
    }, []);

    // Refs to store latest states and avoid stale closures
    const gridRef = useRef(grid);
    const activePieceRef = useRef(activePiece);

    useEffect(() => {
        gridRef.current = grid;
    }, [grid]);

    useEffect(() => {
        activePieceRef.current = activePiece;
    }, [activePiece]);

    const drop = useCallback(() => {
        if (isGameOver || isPaused) return;

        const currentGrid = gridRef.current;
        const currentPiece = activePieceRef.current;
        const nextPosition = { ...currentPiece.position, y: currentPiece.position.y + 1 };

        if (!hasCollision(currentPiece.shape, nextPosition, currentGrid)) {
            setActivePiece((prev) => ({
                ...prev,
                position: nextPosition
            }));
        } else {
            const mergedGrid = mergePieceIntoGrid(currentGrid, currentPiece);
            const { newGrid, linesCleared } = clearLines(mergedGrid);

            updateScore(linesCleared);

            if (checkGameOver(newGrid)) {
                setIsGameOver(true);
                console.log("Game Over!");
            } else {
                const next = onNextPiece();
                setActivePiece(next);
                setPieceCounts(prev => ({
                    ...prev,
                    [next.type as Exclude<Cell, 0>]: (prev[next.type as Exclude<Cell, 0>] || 0) + 1
                }));
                if (onLockDown) onLockDown();
            }

            setGrid(newGrid);
        }
    }, [isGameOver, isPaused, updateScore, onNextPiece, onLockDown]);

    const hardDrop = useCallback(() => {
        if (isGameOver || isPaused) return;

        const currentGrid = gridRef.current;
        const currentPiece = activePieceRef.current;
        const nextPosition = { ...currentPiece.position };

        while (!hasCollision(currentPiece.shape, { x: nextPosition.x, y: nextPosition.y + 1 }, currentGrid)) {
            nextPosition.y += 1;
        }

        const finalizedPiece = { ...currentPiece, position: nextPosition };
        const mergedGrid = mergePieceIntoGrid(currentGrid, finalizedPiece);
        const { newGrid, linesCleared } = clearLines(mergedGrid);

        updateScore(linesCleared);

        if (checkGameOver(newGrid)) {
            setIsGameOver(true);
            console.log("Game Over!");
        } else {
            const next = onNextPiece();
            setActivePiece(next);
            setPieceCounts(prev => ({
                ...prev,
                [next.type as Exclude<Cell, 0>]: (prev[next.type as Exclude<Cell, 0>] || 0) + 1
            }));
            if (onLockDown) onLockDown();
        }

        setGrid(newGrid);
    }, [isGameOver, isPaused, updateScore, onNextPiece, onLockDown]);

    const moveLeft = useCallback(() => {
        if (isGameOver || isPaused) return;
        setActivePiece(prevPiece => movePieceBy(gridRef.current, prevPiece, -1, 0));
    }, [isGameOver, isPaused]);

    const moveRight = useCallback(() => {
        if (isGameOver || isPaused) return;
        setActivePiece(prevPiece => movePieceBy(gridRef.current, prevPiece, 1, 0));
    }, [isGameOver, isPaused]);

    const rotateCW = useCallback(() => {
        if (isGameOver || isPaused) return;
        setActivePiece(prevPiece => {
            const nextShape = rotatePiece(prevPiece.shape, 'CW');
            const kickPositions = [
                { ...prevPiece.position },
                { ...prevPiece.position, x: prevPiece.position.x - 1 },
                { ...prevPiece.position, x: prevPiece.position.x + 1 }
            ];
            for (const pos of kickPositions) {
                if (!hasCollision(nextShape, pos, gridRef.current)) {
                    return { ...prevPiece, shape: nextShape, position: pos };
                }
            }
            return prevPiece;
        });
    }, [isGameOver, isPaused]);

    const rotateCCW = useCallback(() => {
        if (isGameOver || isPaused) return;
        setActivePiece(prevPiece => {
            const nextShape = rotatePiece(prevPiece.shape, 'CCW');
            const kickPositions = [
                { ...prevPiece.position },
                { ...prevPiece.position, x: prevPiece.position.x - 1 },
                { ...prevPiece.position, x: prevPiece.position.x + 1 }
            ];
            for (const pos of kickPositions) {
                if (!hasCollision(nextShape, pos, gridRef.current)) {
                    return { ...prevPiece, shape: nextShape, position: pos };
                }
            }
            return prevPiece;
        });
    }, [isGameOver, isPaused]);

    const togglePause = useCallback(() => {
        if (isGameOver) return;
        setIsPaused(prev => !prev);
    }, [isGameOver]);

    const restartBaseGame = useCallback((initialPiece: ActivePiece) => {
        setGrid(createEmptyGrid());
        setActivePiece(initialPiece);
        setIsGameOver(false);
        setIsPaused(false);
        resetScore();
        setPieceCounts({
            I: 0,
            O: 0,
            T: 0,
            S: 0,
            Z: 0,
            J: 0,
            L: 0,
            [initialPiece.type]: 1
        });
        if (onReset) onReset();
    }, [resetScore, onReset]);

    // Handle gravity drop interval
    useEffect(() => {
        if (isGameOver || isPaused) return;

        const dropInterval = Math.max(50, 1000 * 0.9 ** (level - 1));
        const id = setInterval(() => {
            drop();
        }, dropInterval);

        return () => clearInterval(id);
    }, [drop, isGameOver, isPaused, level]);

    // Track the first piece on mount
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (!hasInitializedRef.current && activePiece) {
            setPieceCounts(prev => ({
                ...prev,
                [activePiece.type as Exclude<Cell, 0>]: (prev[activePiece.type as Exclude<Cell, 0>] || 0) + 1
            }));
            hasInitializedRef.current = true;
        }
    }, [activePiece]);

    // Calculate landing shadow Y position
    let ghostY = activePiece.position.y;
    while (!hasCollision(activePiece.shape, { x: activePiece.position.x, y: ghostY + 1 }, grid)) {
        ghostY++;
    }

    return {
        grid,
        setGrid,
        activePiece,
        setActivePiece,
        ghostY,
        isGameOver,
        setIsGameOver,
        isPaused,
        setIsPaused,
        score,
        lines,
        level,
        togglePause,
        restartBaseGame,
        drop,
        hardDrop,
        moveLeft,
        moveRight,
        rotateCW,
        rotateCCW,
        pieceCounts,
        incrementPieceCount
    };
};
