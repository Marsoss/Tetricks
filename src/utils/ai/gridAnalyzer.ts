import { GRID_HEIGHT, GRID_WIDTH } from '../../constants/tetris';
import { Grid } from '../../types/tetris';

/**
 * Returns an array representing the height of each column on the board.
 * Height of a column is defined as the distance from the bottom of the grid
 * to the highest filled cell in that column.
 */
export function getHeights(grid: Grid): number[] {
    const heights = Array(GRID_WIDTH).fill(0);
    for (let col = 0; col < GRID_WIDTH; col++) {
        for (let row = 0; row < GRID_HEIGHT; row++) {
            if (grid[row][col] !== 0) {
                heights[col] = GRID_HEIGHT - row;
                break;
            }
        }
    }
    return heights;
}

/**
 * Sum of the heights of all columns.
 */
export function getAggregateHeight(grid: Grid): number {
    return getHeights(grid).reduce((sum, h) => sum + h, 0);
}

/**
 * Count of empty cells (0) that have at least one occupied cell above them
 * in the same column.
 */
export function getHolesCount(grid: Grid): number {
    let holes = 0;
    for (let col = 0; col < GRID_WIDTH; col++) {
        let blockFound = false;
        for (let row = 0; row < GRID_HEIGHT; row++) {
            if (grid[row][col] !== 0) {
                blockFound = true;
            } else if (blockFound && grid[row][col] === 0) {
                holes++;
            }
        }
    }
    return holes;
}

/**
 * Sum of the absolute differences in height between all adjacent columns.
 */
export function getBumpiness(grid: Grid): number {
    const heights = getHeights(grid);
    let bumpiness = 0;
    for (let col = 0; col < GRID_WIDTH - 1; col++) {
        bumpiness += Math.abs(heights[col] - heights[col + 1]);
    }
    return bumpiness;
}

/**
 * Counts the number of complete rows that would be cleared in the grid.
 */
export function getLinesCleared(grid: Grid): number {
    return grid.filter(row => row.every(cell => cell !== 0)).length;
}

/**
 * Calculates the total depth of all wells on the board.
 * A well is defined as a vertical empty space of width 1 bordered by higher blocks
 * on both sides (or the grid boundaries for the leftmost and rightmost columns).
 */
export function getWellsDepth(grid: Grid): number {
    const heights = getHeights(grid);
    let totalDepth = 0;

    for (let col = 0; col < GRID_WIDTH; col++) {
        const leftHeight = col === 0 ? GRID_HEIGHT : heights[col - 1];
        const rightHeight = col === GRID_WIDTH - 1 ? GRID_HEIGHT : heights[col + 1];
        const minAdjacentHeight = Math.min(leftHeight, rightHeight);

        if (heights[col] < minAdjacentHeight) {
            totalDepth += (minAdjacentHeight - heights[col]);
        }
    }
    return totalDepth;
}
