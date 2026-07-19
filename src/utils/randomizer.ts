import { Cell } from '../types/tetris';

export type RandomizerType = '7-bag' | 'nes' | 'history' | 'pure';

export class TetrominoRandomizer {
    private type: RandomizerType;
    private bag: Cell[] = [];
    private prevPiece: Cell | null = null;
    private history: Cell[] = [];

    constructor(type: RandomizerType = '7-bag') {
        this.type = type;
    }

    /**
     * Resets the randomizer's state (empty bag, clear memory).
     */
    public reset(): void {
        this.bag = [];
        this.prevPiece = null;
        this.history = [];
    }

    /**
     * Updates the active randomizer type.
     */
    public setType(type: RandomizerType): void {
        this.type = type;
        this.reset();
    }

    /**
     * Selects and returns the next tetromino block type according to the active algorithm.
     */
    public getNextPieceType(): Cell {
        const pieces: Cell[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

        if (this.type === '7-bag') {
            if (this.bag.length === 0) {
                const newBag = [...pieces];
                // Shuffle bag using Fisher-Yates algorithm
                for (let i = newBag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
                }
                this.bag = newBag;
            }
            return this.bag.pop()!;
        } else if (this.type === 'nes') {
            const randomPiece = () => pieces[Math.floor(Math.random() * 7)];
            let nextType = randomPiece();
            // Single duplicate rollback re-roll
            if (nextType === this.prevPiece) {
                nextType = randomPiece();
            }
            this.prevPiece = nextType;
            return nextType;
        } else if (this.type === 'history') {
            const randomPiece = () => pieces[Math.floor(Math.random() * 7)];
            let nextType = randomPiece();
            let tries = 0;
            // Retry up to 6 times if block exists in history
            while (this.history.includes(nextType) && tries < 6) {
                nextType = randomPiece();
                tries++;
            }
            // Update sliding history of the last 4 blocks
            this.history = [...this.history, nextType].slice(-4);
            return nextType;
        } else {
            // pure
            return pieces[Math.floor(Math.random() * 7)];
        }
    }
}
