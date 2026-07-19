import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createEmptyGrid, getTetrominoByType } from '../utils/tetris';
import { ActivePiece, Grid, Cell } from '../types/tetris';
import { hasCollision, mergePieceIntoGrid, clearLines, checkGameOver, rotatePiece, movePieceBy } from '../utils/tetrisLogic';
import { useTetrisScore } from './useTetrisScore';
import { useTetrisControls } from './useTetrisControl';
import { KeyMap } from '../types/settings';
import { classicRules } from '../utils/rules/classicRules';
import { modernRules } from '../utils/rules/modernRules';
import { TetrisAI, AIChoice } from '../types/tetrisAI';
import { getRuleSetConfig } from '../config/scoreConfig';

export const useTetris = (
    keyMap: KeyMap,
    mode: 'classic' | 'modern',
    isAIMode: boolean,
    currentAI: TetrisAI | null
) => {
    // Select current strategy rules
    const rules = mode === 'modern' ? modernRules : classicRules;
    const ruleSetConfig = useMemo(() => getRuleSetConfig(mode), [mode]);

    // Core state
    const [grid, setGrid] = useState<Grid>(() => createEmptyGrid());
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);

    // Scoring state (now config-driven)
    const {
        score, lines, level,
        comboCounter, backToBackActive,
        updateScore, processGameEvent,
        resetScore, getGravity
    } = useTetrisScore(ruleSetConfig);

    // Strategy-specific randomizer state (bag / history)
    const [bag, setBag] = useState<Cell[]>([]);

    // Preview and Hold states
    const [nextPieces, setNextPieces] = useState<Cell[]>([]);
    const [activePiece, setActivePiece] = useState<ActivePiece>(() => getTetrominoByType('I'));
    const [holdPiece, setHoldPiece] = useState<Cell | null>(null);
    const [hasHeldThisTurn, setHasHeldThisTurn] = useState<boolean>(false);

    // Statistics state
    const [pieceCounts, setPieceCounts] = useState<Record<Exclude<Cell, 0>, number>>({
        I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0
    });

    // Refs for stale closures prevention
    const activePieceRef = useRef<ActivePiece>(activePiece);
    const nextPiecesRef = useRef<Cell[]>([]);
    const holdPieceRef = useRef<Cell | null>(null);
    const hasHeldThisTurnRef = useRef<boolean>(false);
    const bagRef = useRef<Cell[]>([]);
    const gridRef = useRef<Grid>(grid);

    useEffect(() => { activePieceRef.current = activePiece; }, [activePiece]);
    useEffect(() => { nextPiecesRef.current = nextPieces; }, [nextPieces]);
    useEffect(() => { holdPieceRef.current = holdPiece; }, [holdPiece]);
    useEffect(() => { hasHeldThisTurnRef.current = hasHeldThisTurn; }, [hasHeldThisTurn]);
    useEffect(() => { bagRef.current = bag; }, [bag]);
    useEffect(() => { gridRef.current = grid; }, [grid]);

    // Initial setup
    const initializeGame = useCallback(() => {
        const queueSize = ruleSetConfig.features.previewCount;
        let tempBag = [] as Cell[];
        let tempQueue = [] as Cell[];

        for (let i = 0; i < queueSize + 1; i++) {
            const res = rules.getRandomTetromino(tempBag);
            tempQueue.push(res.nextPiece);
            tempBag = res.newBag;
        }

        const firstPiece = getTetrominoByType(tempQueue[0]);
        setActivePiece(firstPiece);
        setNextPieces(tempQueue.slice(1));
        setBag(tempBag);
        setHoldPiece(null);
        setHasHeldThisTurn(false);
        setGrid(createEmptyGrid());
        setIsGameOver(false);
        setIsPaused(false);
        resetScore();

        // Initialize piece statistics
        setPieceCounts({
            I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0,
            [firstPiece.type]: 1
        });
    }, [mode, rules, resetScore, ruleSetConfig]);

    // Initialize on start or rule strategy switch
    useEffect(() => {
        initializeGame();
    }, [mode]);

    const incrementPieceCount = useCallback((type: Exclude<Cell, 0>) => {
        setPieceCounts(prev => ({
            ...prev,
            [type]: (prev[type] || 0) + 1
        }));
    }, []);

    // Core Game Spawning & Ticking Functions
    const spawnNextPiece = useCallback((currentBag: Cell[]) => {
        if (nextPiecesRef.current.length === 0) return;

        const nextType = nextPiecesRef.current[0];
        const res = rules.getRandomTetromino(currentBag);
        
        // Refill preview queue
        setNextPieces([...nextPiecesRef.current.slice(1), res.nextPiece]);
        setBag(res.newBag);

        const newActive = getTetrominoByType(nextType);
        setActivePiece(newActive);
        setHasHeldThisTurn(false);

        // Update counts
        incrementPieceCount(newActive.type as Exclude<Cell, 0>);
    }, [rules, incrementPieceCount]);

    const drop = useCallback(() => {
        if (isGameOver || isPaused) return;

        const currentGrid = gridRef.current;
        const currentPiece = activePieceRef.current;
        const nextPosition = { ...currentPiece.position, y: currentPiece.position.y + 1 };

        if (!hasCollision(currentPiece.shape, nextPosition, currentGrid)) {
            setActivePiece(prev => ({ ...prev, position: nextPosition }));
        } else {
            const mergedGrid = mergePieceIntoGrid(currentGrid, currentPiece);
            const { newGrid, linesCleared } = clearLines(mergedGrid);

            updateScore(linesCleared);

            if (checkGameOver(newGrid)) {
                setIsGameOver(true);
            } else {
                spawnNextPiece(bagRef.current);
            }
            setGrid(newGrid);
        }
    }, [isGameOver, isPaused, updateScore, spawnNextPiece]);

    const hardDrop = useCallback(() => {
        if (isGameOver || isPaused) return;

        const currentGrid = gridRef.current;
        const currentPiece = activePieceRef.current;
        const nextPosition = { ...currentPiece.position };
        const startY = currentPiece.position.y;

        while (!hasCollision(currentPiece.shape, { x: nextPosition.x, y: nextPosition.y + 1 }, currentGrid)) {
            nextPosition.y += 1;
        }

        const cellsDropped = nextPosition.y - startY;

        // Award hard drop points
        if (cellsDropped > 0) {
            processGameEvent({ type: 'HARD_DROP', cellsDropped });
        }

        const finalizedPiece = { ...currentPiece, position: nextPosition };
        const mergedGrid = mergePieceIntoGrid(currentGrid, finalizedPiece);
        const { newGrid, linesCleared } = clearLines(mergedGrid);

        // Check for perfect clear (grid entirely empty after clearing)
        const isPerfectClear = linesCleared > 0 && newGrid.every(row => row.every(cell => cell === 0));

        if (linesCleared > 0) {
            processGameEvent({ type: 'LINE_CLEAR', linesCleared, isPerfectClear });
        } else {
            // No lines cleared — still need to report to reset combo
            processGameEvent({ type: 'LINE_CLEAR', linesCleared: 0 });
        }

        if (checkGameOver(newGrid)) {
            setIsGameOver(true);
        } else {
            spawnNextPiece(bagRef.current);
        }
        setGrid(newGrid);
    }, [isGameOver, isPaused, processGameEvent, spawnNextPiece]);

    const hold = useCallback(() => {
        if (!ruleSetConfig.features.hasHold || isGameOver || isPaused) return;
        if (hasHeldThisTurnRef.current) return;

        const currentType = activePieceRef.current.type;

        if (holdPieceRef.current === null) {
            setHoldPiece(currentType);
            const nextType = nextPiecesRef.current[0];
            const res = rules.getRandomTetromino(bagRef.current);

            setNextPieces([...nextPiecesRef.current.slice(1), res.nextPiece]);
            setBag(res.newBag);

            const newActive = getTetrominoByType(nextType);
            setActivePiece(newActive);
            incrementPieceCount(newActive.type as Exclude<Cell, 0>);
        } else {
            const prevHold = holdPieceRef.current;
            setHoldPiece(currentType);
            setActivePiece(getTetrominoByType(prevHold));
        }

        setHasHeldThisTurn(true);
    }, [ruleSetConfig, isGameOver, isPaused, rules, incrementPieceCount]);

    const moveLeft = useCallback(() => {
        if (isGameOver || isPaused) return;
        setActivePiece(prev => movePieceBy(gridRef.current, prev, -1, 0));
    }, [isGameOver, isPaused]);

    const moveRight = useCallback(() => {
        if (isGameOver || isPaused) return;
        setActivePiece(prev => movePieceBy(gridRef.current, prev, 1, 0));
    }, [isGameOver, isPaused]);

    const rotateCW = useCallback(() => {
        if (isGameOver || isPaused) return;
        setActivePiece(prevPiece => {
            const nextShape = rotatePiece(prevPiece.shape, 'CW');
            
            const kickPositions = rules.hasWallKicks 
                ? [
                    { ...prevPiece.position },
                    { ...prevPiece.position, x: prevPiece.position.x - 1 },
                    { ...prevPiece.position, x: prevPiece.position.x + 1 }
                  ]
                : [ { ...prevPiece.position } ];

            for (const pos of kickPositions) {
                if (!hasCollision(nextShape, pos, gridRef.current)) {
                    return { ...prevPiece, shape: nextShape, position: pos };
                }
            }
            return prevPiece;
        });
    }, [isGameOver, isPaused, rules]);

    const rotateCCW = useCallback(() => {
        if (isGameOver || isPaused) return;
        setActivePiece(prevPiece => {
            const nextShape = rotatePiece(prevPiece.shape, 'CCW');

            const kickPositions = rules.hasWallKicks 
                ? [
                    { ...prevPiece.position },
                    { ...prevPiece.position, x: prevPiece.position.x - 1 },
                    { ...prevPiece.position, x: prevPiece.position.x + 1 }
                  ]
                : [ { ...prevPiece.position } ];

            for (const pos of kickPositions) {
                if (!hasCollision(nextShape, pos, gridRef.current)) {
                    return { ...prevPiece, shape: nextShape, position: pos };
                }
            }
            return prevPiece;
        });
    }, [isGameOver, isPaused, rules]);

    const togglePause = useCallback(() => {
        if (isGameOver) return;
        setIsPaused(prev => !prev);
    }, [isGameOver]);

    // Handle standard gravity drop intervals (disabled during AI Mode)
    useEffect(() => {
        if (isGameOver || isPaused || isAIMode) return;

        const dropInterval = getGravity(level);
        const id = setInterval(() => {
            drop();
        }, dropInterval);

        return () => clearInterval(id);
    }, [drop, isGameOver, isPaused, level, isAIMode, getGravity]);

    // Keyboard controls binder
    useTetrisControls({
        moveLeft,
        moveRight,
        rotateCW,
        rotateCCW,
        drop,
        hardDrop,
        hold,
        isGameOver,
        isPaused,
        togglePause,
        keyMap
    });

    // Execute an AI decision choice in-game
    const executeAIMove = useCallback((choice: AIChoice) => {
        if (isGameOver || isPaused) return;

        let placementPiece: ActivePiece;
        let nextActiveType: Cell;

        if (choice.useHold) {
            const currentType = activePieceRef.current.type;
            const oldHold = holdPieceRef.current;

            // Perform Hold Swap
            setHoldPiece(currentType);
            
            if (oldHold === null) {
                // Hold was empty. We placed nextPieces[0].
                placementPiece = getTetrominoByType(nextPiecesRef.current[0]);

                // The new active piece for the next turn must be nextPieces[1].
                nextActiveType = nextPiecesRef.current[1];

                // We consumed nextPieces[0] (placed) and nextPieces[1] (spawning active).
                // So shift queue by 2, add 2 new random pieces.
                let tempBag = [...bagRef.current];
                const res1 = rules.getRandomTetromino(tempBag);
                const res2 = rules.getRandomTetromino(res1.newBag);

                setNextPieces([...nextPiecesRef.current.slice(2), res1.nextPiece, res2.nextPiece]);
                setBag(res2.newBag);
            } else {
                // Hold was not empty. We placed oldHold.
                placementPiece = getTetrominoByType(oldHold);

                // The new active piece for the next turn is nextPieces[0].
                nextActiveType = nextPiecesRef.current[0];

                // Shift queue by 1, add 1 new random piece
                const res = rules.getRandomTetromino(bagRef.current);
                setNextPieces([...nextPiecesRef.current.slice(1), res.nextPiece]);
                setBag(res.newBag);
            }
            
            setHasHeldThisTurn(true);
        } else {
            // Normal move (no hold). We placed activePiece.
            placementPiece = { ...activePieceRef.current };

            // The new active piece for the next turn is nextPieces[0].
            nextActiveType = nextPiecesRef.current[0];

            // Shift queue by 1, add 1 new random piece
            const res = rules.getRandomTetromino(bagRef.current);
            setNextPieces([...nextPiecesRef.current.slice(1), res.nextPiece]);
            setBag(res.newBag);
            setHasHeldThisTurn(false);
        }

        // Apply rotations to placementPiece
        for (let r = 0; r < choice.rotationCount; r++) {
            placementPiece.shape = rotatePiece(placementPiece.shape, 'CW');
        }
        
        // Move to Target X
        placementPiece.position.x = choice.targetX;
        placementPiece.position.y = 0;

        // Execute placement and immediate drop
        let nextPosition = { ...placementPiece.position };
        while (!hasCollision(placementPiece.shape, { x: nextPosition.x, y: nextPosition.y + 1 }, gridRef.current)) {
            nextPosition.y++;
        }
        placementPiece.position = nextPosition;

        // Merge & Clear
        const mergedGrid = mergePieceIntoGrid(gridRef.current, placementPiece);
        const { newGrid, linesCleared } = clearLines(mergedGrid);

        // Update scores
        updateScore(linesCleared);

        if (checkGameOver(newGrid)) {
            setIsGameOver(true);
        } else {
            // Spawn the new active piece synchronously
            const nextActive = getTetrominoByType(nextActiveType);
            setActivePiece(nextActive);
            incrementPieceCount(nextActiveType as Exclude<Cell, 0>);
        }
        setGrid(newGrid);

    }, [isGameOver, isPaused, updateScore, rules, incrementPieceCount]);

    // AI Loop Timer
    useEffect(() => {
        if (isGameOver || isPaused || !isAIMode || !currentAI) return;

        const aiTickRate = 120; // run decisions every 120ms for smooth watching
        const intervalId = setInterval(() => {
            const choice = currentAI.calculateMove(
                gridRef.current,
                activePieceRef.current.type,
                nextPiecesRef.current,
                level,
                rules,
                holdPieceRef.current,
                hasHeldThisTurnRef.current
            );

            if (choice) {
                executeAIMove(choice);
            } else {
                setIsGameOver(true);
            }
        }, aiTickRate);

        return () => clearInterval(intervalId);
    }, [isGameOver, isPaused, isAIMode, currentAI, executeAIMove, level, rules]);

    // Compute ghostY shadow drop line helper
    let ghostY = activePiece ? activePiece.position.y : 0;
    if (activePiece) {
        while (!hasCollision(activePiece.shape, { x: activePiece.position.x, y: ghostY + 1 }, grid)) {
            ghostY++;
        }
    }

    return {
        grid,
        activePiece,
        ghostY,
        isGameOver,
        isPaused,
        score,
        lines,
        level,
        comboCounter,
        backToBackActive,
        togglePause,
        restartGame: initializeGame,
        nextPieces,
        holdPiece,
        pieceCounts,
        incrementPieceCount,
        ruleSetConfig,
    };
};
