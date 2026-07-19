
export const GRID_WIDTH = 10;
export const GRID_VISIBLE_HEIGHT = 20;
export const BUFFER_ZONE = 4;
export const GRID_HEIGHT = GRID_VISIBLE_HEIGHT + BUFFER_ZONE;

export const TETROMINOS = {
    'I': [
        [0, 0, 0, 0],
        ['I', 'I', 'I', 'I'],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    'J': [
        ['J', 0, 0],
        ['J', 'J', 'J'],
        [0, 0, 0]
    ],
    'L': [
        [0, 0, 'L'],
        ['L', 'L', 'L'],
        [0, 0, 0]
    ],
    'O': [
        ['O', 'O'],
        ['O', 'O']
    ],
    'S': [
        [0, 'S', 'S'],
        ['S', 'S', 0],
        [0, 0, 0]
    ],
    'T': [
        [0, 'T', 0],
        ['T', 'T', 'T'],
        [0, 0, 0]
    ],
    'Z': [
        ['Z', 'Z', 0],
        [0, 'Z', 'Z'],
        [0, 0, 0]
    ]
} as const;
