import { Grid, ActivePiece, PieceShape } from "../types/tetris";
import { GRID_HEIGHT, GRID_WIDTH } from "../constants/tetris";

export function hasCollision(shape: PieceShape, { x, y }: { x: number, y: number }, grid: Grid): boolean {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col] !== 0) {
                const gridY = y + row;
                const gridX = x + col;

                if (
                    gridX < 0 ||
                    gridX >= GRID_WIDTH ||
                    gridY >= GRID_HEIGHT
                ) {
                    return true;
                }

                if (gridY >= 0 && grid[gridY][gridX] !== 0) {
                    return true;
                }

            }
        }
    }
    return false;
}

export function mergePieceIntoGrid(grid: Grid, activePiece: ActivePiece): Grid {
    const newGrid = grid.map(row => [...row]);
    const { shape, position, type } = activePiece;

    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col] !== 0) {
                const gridY = position.y + row;
                const gridX = position.x + col;

                if (gridY >= 0) {
                    newGrid[gridY][gridX] = type;
                }
            }
        }
    }
    return newGrid;
}

export function clearLines(grid: Grid): { newGrid: Grid, linesCleared: number } {
    let newGrid = grid.filter(row => row.some(cell => cell === 0));
    const linesCleared = grid.length - newGrid.length;

    while (newGrid.length < GRID_HEIGHT) {
        newGrid.unshift(Array(GRID_WIDTH).fill(0));
    }

    return { newGrid, linesCleared };
}

export const checkGameOver = (grid: Grid): boolean => {
    return grid[0].some(cell => cell !== 0);
}

export const rotatePiece = (shape: PieceShape, direction: 'CW' | 'CCW' = 'CW'): PieceShape => {
    const transposed = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]));

    if (direction === 'CCW') {
        return transposed.reverse() as PieceShape;
    }

    return transposed.map(row => [...row].reverse()) as PieceShape;
};

export const movePieceBy = (grid: Grid, activePiece: ActivePiece, dx: number, dy: number): ActivePiece => {
    const nextPosition = {
        x: activePiece.position.x + dx,
        y: activePiece.position.y + dy
    };

    if (!hasCollision(activePiece.shape, nextPosition, grid)) {
        return { ...activePiece, position: nextPosition };
    }

    return activePiece;
};  