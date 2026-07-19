import React from 'react';
import { Grid, ActivePiece } from '../types/tetris';
import { GRID_WIDTH, BUFFER_ZONE } from '../constants/tetris';
import { Cell } from './Cell';

interface BoardProps {
    grid: Grid;
    activePiece: ActivePiece;
    ghostY: number;
}

export const Board: React.FC<BoardProps> = ({ grid, activePiece, ghostY }) => {
    // 1. Créer une copie de la grille avec des objets contenant le type et le statut Ghost
    const cellsGrid = grid.map(row => 
        row.map(cell => ({ type: cell, isGhost: false }))
    );

    // 2. Fusionner le fantôme (ghost piece) d'abord
    for (let row = 0; row < activePiece.shape.length; row++) {
        for (let col = 0; col < activePiece.shape[row].length; col++) {
            if (activePiece.shape[row][col] !== 0) {
                const gridY = ghostY + row;
                const gridX = activePiece.position.x + col;

                if (gridY >= 0 && gridY < cellsGrid.length && gridX >= 0 && gridX < cellsGrid[0].length) {
                    cellsGrid[gridY][gridX] = { type: activePiece.type, isGhost: true };
                }
            }
        }
    }

    // 3. Fusionner la pièce active par-dessus
    for (let row = 0; row < activePiece.shape.length; row++) {
        for (let col = 0; col < activePiece.shape[row].length; col++) {
            if (activePiece.shape[row][col] !== 0) {
                const gridY = activePiece.position.y + row;
                const gridX = activePiece.position.x + col;

                if (gridY >= 0 && gridY < cellsGrid.length && gridX >= 0 && gridX < cellsGrid[0].length) {
                    cellsGrid[gridY][gridX] = { type: activePiece.type, isGhost: false };
                }
            }
        }
    }

    // 4. Tronquer pour n'avoir que le plateau visible (les 20 lignes du bas)
    const visibleGrid = cellsGrid.slice(BUFFER_ZONE);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
            width: '450px', // Taille agrandie
            border: '4px solid #333',
            backgroundColor: '#111'
        }}>
            {visibleGrid.flatMap((row, y) =>
                row.map((cell, x) => (
                    // On utilise une clé unique pour React basée sur les coordonnées
                    <Cell key={`${y}-${x}`} type={cell.type} isGhost={cell.isGhost} />
                ))
            )}
        </div>
    );
};