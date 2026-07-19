import { Cell } from '../../types/tetris';
import { TetrisEngineStrategy } from '../../types/tetrisRules';

export const modernRules: TetrisEngineStrategy = {
    name: 'Modern Guideline',
    hasWallKicks: true,

    getRandomTetromino(bag: Cell[]): { nextPiece: Cell; newBag: Cell[] } {
        const pieces: Cell[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        let currentBag = [...bag];

        if (currentBag.length === 0) {
            currentBag = [...pieces];
            // Shuffle using Fisher-Yates
            for (let i = currentBag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [currentBag[i], currentBag[j]] = [currentBag[j], currentBag[i]];
            }
        }

        const nextPiece = currentBag.pop()!;
        return { nextPiece, newBag: currentBag };
    }
};

