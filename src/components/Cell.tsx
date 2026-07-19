import React from 'react';
import { Cell as CellType } from '../types/tetris';

interface CellProps {
    type: CellType;
    isGhost?: boolean;
}

export const Cell: React.FC<CellProps> = ({ type, isGhost = false }) => {
    const colors: Record<string, string> = {
        '0': '#1a1a1a',
        'I': '#00f0f0',
        'O': '#f0f000',
        'T': '#a000f0',
        'S': '#00f000',
        'Z': '#f00000',
        'J': '#0000f0',
        'L': '#f0a000',
    };

    const ghostColors: Record<string, string> = {
        'I': 'rgba(0, 240, 240, 0.15)',
        'O': 'rgba(240, 240, 0, 0.15)',
        'T': 'rgba(160, 0, 240, 0.15)',
        'S': 'rgba(0, 240, 0, 0.15)',
        'Z': 'rgba(240, 0, 0, 0.15)',
        'J': 'rgba(0, 0, 240, 0.15)',
        'L': 'rgba(240, 160, 0, 0.15)',
    };

    const cellStyle = {
        backgroundColor: isGhost ? (ghostColors[type.toString()] || '#1a1a1a') : (colors[type.toString()] || colors['0']),
        border: isGhost 
            ? `2px dashed ${colors[type.toString()] || '#555'}` 
            : (type === 0 ? '1px solid #2d2d2d' : '1px solid rgba(255,255,255,0.3)'),
        boxSizing: 'border-box' as const,
        aspectRatio: '1',
    };

    return <div style={cellStyle} />;
};