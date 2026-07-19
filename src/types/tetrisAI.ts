import { Grid, Cell } from './tetris';

export interface AIChoice {
    rotationCount: number; // 0 to 3 CW rotations
    targetX: number;       // Column coordinate where left edge of block will end up
    useHold?: boolean;     // Whether to swap piece with the Hold box first
}

export interface TetrisAI {
    name: string;
    calculateMove(
        grid: Grid,
        activePieceType: Cell,
        nextPieces: Cell[],
        level?: number,
        rules?: any,
        holdPiece?: Cell | null,
        hasHeldThisTurn?: boolean
    ): AIChoice | null;
}

export interface Genome {
    id: string;
    weights: {
        height: number;
        holes: number;
        bumpiness: number;
        lines: number;
        wells: number;
    };
    fitness: number;
}
