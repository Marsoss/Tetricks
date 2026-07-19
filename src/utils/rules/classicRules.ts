import { Cell } from '../../types/tetris';
import { TetrisEngineStrategy } from '../../types/tetrisRules';

export const classicRules: TetrisEngineStrategy = {
    name: 'Classic NES',
    hasWallKicks: false,

    getRandomTetromino(bag: Cell[]): { nextPiece: Cell; newBag: Cell[] } {
        const pieces: Cell[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        const prevPiece = bag.length > 0 ? bag[0] : null;

        const firstRoll = pieces[Math.floor(Math.random() * 7)];
        // Retro NES re-rolls once if it matches the previous piece
        const nextPiece = (firstRoll === prevPiece) 
            ? pieces[Math.floor(Math.random() * 7)] 
            : firstRoll;

        return { nextPiece, newBag: [nextPiece] };
    }
};

