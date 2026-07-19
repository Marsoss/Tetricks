import { GRID_HEIGHT, GRID_WIDTH, TETROMINOS } from "../constants/tetris";
import { Grid, ActivePiece, PieceShape, Cell } from "../types/tetris";

export const createEmptyGrid = (): Grid => {
    return Array.from({ length: GRID_HEIGHT }, () =>
        Array.from({ length: GRID_WIDTH }, () => 0)
    );
}


export const getRandomTetromino = (): ActivePiece => {
    const tetrominos = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[];
    const randomIndex = Math.floor(Math.random() * tetrominos.length);
    const type = tetrominos[randomIndex];

    return getTetrominoByType(type);
};

export const getTetrominoByType = (type: Cell): ActivePiece => {
    const pieceType = type as Exclude<Cell, 0>;
    const shape = TETROMINOS[pieceType].map((row: any) => [...row]) as PieceShape;

    const pieceWidth = shape[0].length;
    const startX = Math.floor((GRID_WIDTH - pieceWidth) / 2);

    return {
        shape,
        position: {
            x: startX,
            y: 0
        },
        type: pieceType
    };
};

