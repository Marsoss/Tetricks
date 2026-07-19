import { Grid, Cell } from '../../types/tetris';
import { AIChoice, TetrisAI } from '../../types/tetrisAI';
import { getTetrominoByType } from '../tetris';
import { hasCollision, mergePieceIntoGrid, clearLines, rotatePiece, checkGameOver } from '../tetrisLogic';
import { getAggregateHeight, getHolesCount, getBumpiness, getLinesCleared, getWellsDepth } from './gridAnalyzer';

export interface HeuristicWeights {
    height: number;
    holes: number;
    bumpiness: number;
    lines: number;
    wells?: number; // added wells weight
}

// standard optimized weights for high-level play (Dellacherie/El-Tetris)
export const DEFAULT_WEIGHTS: HeuristicWeights = {
    height: -0.15,
    holes: -3.50,
    bumpiness: -0.15,
    lines: 2.50,
    wells: -0.10,
};

// Exponential score values to prioritize Tetris (4-line clear) over single-line clears.
// Penalizing 1-line and 2-line clears prevents the AI from clearing them unless necessary for survival.
const HEURISTIC_LINE_SCORES = [0, -12, -3, 15, 750];

function getMaxHeight(grid: Grid): number {
    const height = grid.length;
    const width = grid[0].length;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] !== 0) {
                return height - y;
            }
        }
    }
    return 0;
}

interface EvaluationResult {
    score: number;
    choice: AIChoice | null;
}

function evaluateBestMove(
    activePieceType: Cell,
    lookaheadQueue: Cell[],
    grid: Grid,
    currentWeights: any,
    lineScores: number[],
    wellsWeight: number
): EvaluationResult {
    let bestScore = -Infinity;
    let bestChoice: AIChoice | null = null;

    // Try all 4 orientations (0, 90, 180, 270 degrees)
    for (let rot = 0; rot < 4; rot++) {
        let piece = getTetrominoByType(activePieceType);
        for (let r = 0; r < rot; r++) {
            piece.shape = rotatePiece(piece.shape, 'CW');
        }

        // Try all possible columns X from -3 to 10
        for (let x = -3; x < 10; x++) {
            piece.position.x = x;
            piece.position.y = 0;

            // Skip invalid placement positions
            if (hasCollision(piece.shape, piece.position, grid)) {
                continue;
            }

            // Drop piece to bottom
            let dropY = 0;
            while (!hasCollision(piece.shape, { x, y: dropY + 1 }, grid)) {
                dropY++;
            }

            const placedPiece = {
                ...piece,
                position: { x, y: dropY }
            };

            // Simulate placing the piece
            const simulatedMerged = mergePieceIntoGrid(grid, placedPiece);
            if (checkGameOver(simulatedMerged)) {
                continue; // Skip immediate game over placements
            }
            const linesCount = getLinesCleared(simulatedMerged);
            const { newGrid } = clearLines(simulatedMerged);

            // Calculate score points gained for first piece
            const pointsGained1 = lineScores[linesCount];

            let bestNextFitness = -Infinity;
            const nextType = lookaheadQueue[0];

            if (nextType) {
                // Lookahead: Try all placements for the next piece in the queue
                for (let rot2 = 0; rot2 < 4; rot2++) {
                    let piece2 = getTetrominoByType(nextType);
                    for (let r2 = 0; r2 < rot2; r2++) {
                        piece2.shape = rotatePiece(piece2.shape, 'CW');
                    }

                    for (let x2 = -3; x2 < 10; x2++) {
                        piece2.position.x = x2;
                        piece2.position.y = 0;

                        if (hasCollision(piece2.shape, piece2.position, newGrid)) {
                            continue;
                        }

                        let dropY2 = 0;
                        while (!hasCollision(piece2.shape, { x: x2, y: dropY2 + 1 }, newGrid)) {
                            dropY2++;
                        }

                        const placedPiece2 = {
                            ...piece2,
                            position: { x: x2, y: dropY2 }
                        };

                        const simulatedMerged2 = mergePieceIntoGrid(newGrid, placedPiece2);
                        if (checkGameOver(simulatedMerged2)) {
                            continue;
                        }
                        const linesCount2 = getLinesCleared(simulatedMerged2);
                        const { newGrid: newGrid2 } = clearLines(simulatedMerged2);

                        // Run analysis metrics on resulting grid after second piece
                        const height2 = getAggregateHeight(newGrid2);
                        const holes2 = getHolesCount(newGrid2);
                        const bumpiness2 = getBumpiness(newGrid2);
                        const wells2 = getWellsDepth(newGrid2);

                        const pointsGained2 = lineScores[linesCount2];

                        const fitness2 = 
                            (currentWeights.height * height2) +
                            (currentWeights.holes * holes2) +
                            (currentWeights.bumpiness * bumpiness2) +
                            (wellsWeight * wells2) +
                            (currentWeights.lines * (pointsGained1 + pointsGained2));

                        if (fitness2 > bestNextFitness) {
                            bestNextFitness = fitness2;
                        }
                    }
                }
            }

            // Fall back with penalty if terminal state
            const scoreValue = bestNextFitness !== -Infinity ? bestNextFitness : (
                (currentWeights.height * getAggregateHeight(newGrid)) +
                (currentWeights.holes * getHolesCount(newGrid)) +
                (currentWeights.bumpiness * getBumpiness(newGrid)) +
                (wellsWeight * getWellsDepth(newGrid)) +
                (currentWeights.lines * pointsGained1) - 50000
            );

            if (scoreValue > bestScore) {
                bestScore = scoreValue;
                bestChoice = { rotationCount: rot, targetX: x };
            }
        }
    }

    return { score: bestScore, choice: bestChoice };
}

export class HeuristicsAI implements TetrisAI {
    public name: string;
    public weights: HeuristicWeights;

    constructor(name = "IA Heuristique", weights = DEFAULT_WEIGHTS) {
        this.name = name;
        this.weights = weights;
    }

    public calculateMove(
        grid: Grid,
        activePieceType: Cell,
        nextPieces: Cell[],
        _level?: number,
        _rules?: any,
        holdPiece?: Cell | null,
        hasHeldThisTurn?: boolean
    ): AIChoice | null {
        const maxH = getMaxHeight(grid);
        const isPanic = maxH > 8;

        // Dynamic weights based on panic mode
        const currentWeights = isPanic ? {
            height: -1.20,
            holes: -4.00,
            bumpiness: -0.15,
            lines: 5.00,
            wells: -0.10
        } : {
            height: this.weights.height,
            holes: this.weights.holes,
            bumpiness: this.weights.bumpiness,
            lines: this.weights.lines,
            wells: this.weights.wells ?? -0.10
        };

        const lineScores = isPanic ? [0, 40, 100, 300, 1200] : HEURISTIC_LINE_SCORES;
        const wellsWeight = currentWeights.wells;

        // 1. Evaluate NO HOLD option
        const resultNoHold = evaluateBestMove(
            activePieceType,
            nextPieces,
            grid,
            currentWeights,
            lineScores,
            wellsWeight
        );

        // If hold is not supported, or already held this turn, return NO HOLD result
        if (holdPiece === undefined || hasHeldThisTurn) {
            return resultNoHold.choice;
        }

        // 2. Evaluate HOLD option
        const swappedType = holdPiece === null ? nextPieces[0] : holdPiece;
        const lookaheadQueue = holdPiece === null ? nextPieces.slice(1) : nextPieces;

        const resultHold = evaluateBestMove(
            swappedType,
            lookaheadQueue,
            grid,
            currentWeights,
            lineScores,
            wellsWeight
        );

        // Compare the results. If hold gives a better outcome, privilege it!
        // We apply a very small tie-breaker bias (e.g. 0.05) to avoid holding unnecessarily.
        if (resultHold.score > resultNoHold.score + 0.05 && resultHold.choice) {
            return {
                ...resultHold.choice,
                useHold: true
            };
        }

        return resultNoHold.choice;
    }
}
