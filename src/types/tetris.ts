
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type Cell = 0 | TetrominoType;

export type Grid = Cell[][];

export type PieceShape = Cell[][];

export type ActivePiece = {
    shape: PieceShape;
    position: { x: number, y: number };
    type: TetrominoType
}