import { Cell } from './tetris';

export interface TetrisEngineStrategy {
    name: string;
    getRandomTetromino(bag: Cell[]): { nextPiece: Cell; newBag: Cell[] };
    hasWallKicks: boolean;
}

