import { Cell } from '../../types/tetris';
import { TetrisEngineStrategy } from '../../types/tetrisRules';
import { TetrisAI } from '../../types/tetrisAI';
import { createEmptyGrid, getTetrominoByType } from '../tetris';
import { hasCollision, mergePieceIntoGrid, clearLines, checkGameOver, rotatePiece } from '../tetrisLogic';
import { ScoreSystem } from '../../systems/scoreSystem';
import { LevelSystem } from '../../systems/levelSystem';
import { RuleSetConfig, MODERN_GUIDELINE_CONFIG } from '../../config/scoreConfig';

/**
 * Headless simulator to evaluate a Tetris AI genome using a specific rules strategy.
 * Returns the final score accumulated.
 * 
 * @param ai The AI brain to evaluate.
 * @param rules The rules engine strategy to drive the game behavior.
 * @param maxPieces Limit the simulator run size to avoid infinite loops for high-performing AIs (defaults to 2000).
 * @param ruleSetConfig Optional RuleSetConfig for scoring. Defaults to MODERN_GUIDELINE_CONFIG.
 */
export function simulateGame(
    ai: TetrisAI,
    rules: TetrisEngineStrategy,
    maxPieces: number = 2000,
    ruleSetConfig: RuleSetConfig = MODERN_GUIDELINE_CONFIG
): number {
    let grid = createEmptyGrid();
    let totalLines = 0;
    let bag: Cell[] = [];
    let gameOver = false;

    const scoreSystem = new ScoreSystem(ruleSetConfig.score, ruleSetConfig.features);
    const levelSystem = new LevelSystem(ruleSetConfig.level);

    // Prefill preview queue of pieces (NES needs 1, Modern needs 4)
    let nextPieces: Cell[] = [];
    for (let i = 0; i < 5; i++) {
        const res = rules.getRandomTetromino(bag);
        nextPieces.push(res.nextPiece);
        bag = res.newBag;
    }

    let piecesPlaced = 0;
    while (!gameOver && piecesPlaced < maxPieces) {
        piecesPlaced++;

        // Pop the first piece from the queue as active
        const activeType = nextPieces[0];
        // Refill queue
        const res = rules.getRandomTetromino(bag);
        nextPieces = [...nextPieces.slice(1), res.nextPiece];
        bag = res.newBag;

        // Ask the AI to decide
        const level = levelSystem.getLevel(totalLines);
        const choice = ai.calculateMove(grid, activeType, nextPieces, level, rules);
        if (!choice) {
            gameOver = true;
            break;
        }

        // Create piece representation
        let piece = getTetrominoByType(activeType);

        // Apply rotations
        for (let r = 0; r < choice.rotationCount; r++) {
            piece.shape = rotatePiece(piece.shape, 'CW');
        }

        // Apply positioning X
        piece.position.x = choice.targetX;

        // Verify if initial spawn collided
        if (hasCollision(piece.shape, piece.position, grid)) {
            gameOver = true;
            break;
        }

        // Drop piece to bottom
        while (!hasCollision(piece.shape, { x: piece.position.x, y: piece.position.y + 1 }, grid)) {
            piece.position.y++;
        }

        // Finalize merge and line clears
        const mergedGrid = mergePieceIntoGrid(grid, piece);
        const { newGrid, linesCleared } = clearLines(mergedGrid);
        grid = newGrid;

        // Update score and metrics
        if (linesCleared > 0) {
            scoreSystem.processEvent({
                type: 'LINE_CLEAR',
                linesCleared,
            }, level);
            totalLines += linesCleared;
        }

        if (checkGameOver(grid)) {
            gameOver = true;
        }
    }

    return scoreSystem.score;
}

