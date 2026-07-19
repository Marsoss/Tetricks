import { Grid, Cell } from '../../types/tetris';
import { AIChoice, TetrisAI } from '../../types/tetrisAI';
import { getTetrominoByType } from '../tetris';
import { hasCollision, rotatePiece } from '../tetrisLogic';

export class RandomAI implements TetrisAI {
    public name = "IA Aléatoire";

    public calculateMove(
        grid: Grid,
        activePieceType: Cell,
        _nextPieces: Cell[],
        _level?: number,
        _rules?: any,
        _holdPiece?: Cell | null,
        _hasHeldThisTurn?: boolean
    ): AIChoice | null {
        const possibleMoves: AIChoice[] = [];

        // Check all 4 rotations
        for (let rot = 0; rot < 4; rot++) {
            let piece = getTetrominoByType(activePieceType);
            for (let r = 0; r < rot; r++) {
                piece.shape = rotatePiece(piece.shape, 'CW');
            }

            // Columns range on a 10-wide board from -2 to 9 depending on piece width
            for (let x = -2; x < 10; x++) {
                piece.position.x = x;
                piece.position.y = 0;

                // If spawn position doesn't collide, it's a valid candidate column
                if (!hasCollision(piece.shape, piece.position, grid)) {
                    possibleMoves.push({ rotationCount: rot, targetX: x });
                }
            }
        }

        if (possibleMoves.length === 0) return null;

        // Choose randomly among valid placements
        const randomIndex = Math.floor(Math.random() * possibleMoves.length);
        return possibleMoves[randomIndex];
    }
}
