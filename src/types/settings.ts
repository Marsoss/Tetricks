export interface KeyMap {
    moveLeft: string;
    moveRight: string;
    rotateCW: string;
    rotateCCW: string;
    softDrop: string;
    hardDrop: string;
    pause: string;
    hold: string;
}

export const DEFAULT_KEYMAP: KeyMap = {
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    rotateCW: 'ArrowUp',
    rotateCCW: 'z',
    softDrop: 'ArrowDown',
    hardDrop: ' ',
    pause: 'Escape',
    hold: 'c'
};

export const KEY_DISPLAY_NAMES: Record<string, string> = {
    ' ': 'Space',
    'ArrowLeft': '← Left',
    'ArrowRight': '→ Right',
    'ArrowUp': '↑ Up',
    'ArrowDown': '↓ Down',
    'Escape': 'Esc',
    'Enter': 'Enter',
    'Backspace': 'Backspace',
    'Tab': 'Tab'
};

export const getFriendlyKeyName = (key: string): string => {
    if (KEY_DISPLAY_NAMES[key]) return KEY_DISPLAY_NAMES[key];
    if (key.length === 1) return key.toUpperCase();
    return key;
};
