import { useEffect } from 'react';
import { KeyMap } from '../types/settings';

interface ControlsProps {
    moveLeft: () => void;
    moveRight: () => void;
    rotateCW: () => void;
    rotateCCW: () => void;
    drop: () => void;
    hardDrop: () => void;
    hold: () => void;
    isGameOver: boolean;
    isPaused: boolean;
    togglePause: () => void;
    keyMap: KeyMap;
}

export const useTetrisControls = ({
    moveLeft, moveRight, rotateCW, rotateCCW, drop, hardDrop, hold, isGameOver, isPaused, togglePause, keyMap
}: ControlsProps) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Escape and 'p' (or the configured pause key) can toggle pause
            if ((event.key === keyMap.pause || event.key.toLowerCase() === 'p') && !isGameOver) {
                event.preventDefault();
                togglePause();
                return;
            }

            if (isGameOver || isPaused) return;

            const keysToPrevent = [
                keyMap.moveLeft,
                keyMap.moveRight,
                keyMap.softDrop,
                keyMap.rotateCW,
                keyMap.rotateCCW,
                keyMap.hardDrop,
                keyMap.hold
            ];
            if (keysToPrevent.includes(event.key)) {
                event.preventDefault();
            }

            if (event.key === keyMap.moveLeft) {
                moveLeft();
            } else if (event.key === keyMap.moveRight) {
                moveRight();
            } else if (event.key === keyMap.softDrop) {
                drop();
            } else if (event.key === keyMap.rotateCW) {
                rotateCW();
            } else if (event.key === keyMap.rotateCCW) {
                rotateCCW();
            } else if (event.key === keyMap.hardDrop) {
                hardDrop();
            } else if (event.key.toLowerCase() === keyMap.hold.toLowerCase()) {
                hold();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveLeft, moveRight, rotateCW, rotateCCW, drop, hardDrop, hold, isGameOver, isPaused, togglePause, keyMap]);
};