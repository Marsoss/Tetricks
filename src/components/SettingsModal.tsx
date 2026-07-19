import React, { useState, useEffect } from 'react';
import { KeyMap, DEFAULT_KEYMAP, getFriendlyKeyName } from '../types/settings';

interface SettingsModalProps {
    keyMap: KeyMap;
    onSave: (newKeyMap: KeyMap) => void;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ keyMap, onSave, onClose }) => {
    const [currentKeys, setCurrentKeys] = useState<KeyMap>({ ...keyMap });
    const [listeningAction, setListeningAction] = useState<keyof KeyMap | null>(null);

    // List of key mapping configurations
    const controlRows: { label: string; action: keyof KeyMap }[] = [
        { label: 'Move Left', action: 'moveLeft' },
        { label: 'Move Right', action: 'moveRight' },
        { label: 'Soft Drop', action: 'softDrop' },
        { label: 'Hard Drop', action: 'hardDrop' },
        { label: 'Rotate CW', action: 'rotateCW' },
        { label: 'Rotate CCW', action: 'rotateCCW' },
        { label: 'Pause Game', action: 'pause' },
        { label: 'Hold Piece', action: 'hold' }
    ];

    useEffect(() => {
        if (!listeningAction) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Prevent default actions like scrolling or refreshing during assignment
            const keysToPrevent = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Tab'];
            if (keysToPrevent.includes(event.key)) {
                event.preventDefault();
            }

            const keyName = event.key;
            setCurrentKeys(prev => ({
                ...prev,
                [listeningAction]: keyName
            }));
            setListeningAction(null);
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [listeningAction]);

    const handleReset = () => {
        setCurrentKeys({ ...DEFAULT_KEYMAP });
        setListeningAction(null);
    };

    const handleSave = () => {
        onSave(currentKeys);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <style dangerouslySetInnerHTML={{ __html: `
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: rgba(9, 9, 11, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    animation: fadeIn 0.3s ease;
                }
                .modal-content {
                    width: 100%;
                    max-width: 480px;
                    background: rgba(20, 20, 30, 0.75);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
                    border-radius: 16px;
                    padding: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    color: #fff;
                    font-family: 'Courier New', Courier, monospace;
                    position: relative;
                }
                .modal-title {
                    font-size: 24px;
                    font-weight: bold;
                    letter-spacing: 2px;
                    margin: 0;
                    color: #00f0f0;
                    border-bottom: 2px solid #a855f7;
                    padding-bottom: 12px;
                }
                .controls-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-height: 320px;
                    overflow-y: auto;
                    padding-right: 8px;
                }
                .control-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 12px 16px;
                    transition: border-color 0.2s;
                }
                .control-row.listening {
                    border-color: #a855f7;
                    background: rgba(168, 85, 247, 0.08);
                }
                .control-label {
                    font-size: 14px;
                    color: #e2e8f0;
                }
                .key-assign-btn {
                    min-width: 140px;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px;
                    color: #e2e8f0;
                    font-size: 13px;
                    font-weight: bold;
                    font-family: inherit;
                    cursor: pointer;
                    text-align: center;
                    transition: all 0.2s;
                }
                .key-assign-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.3);
                }
                .key-assign-btn.active {
                    background: #a855f7;
                    color: #fff;
                    border-color: #c084fc;
                    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
                    animation: pulse 1.5s infinite;
                }
                .modal-actions {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    margin-top: 10px;
                }
                .modal-btn {
                    flex: 1;
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-secondary {
                    background: transparent;
                    border: 1px solid #475569;
                    color: #94a3b8;
                }
                .btn-secondary:hover {
                    border-color: #94a3b8;
                    color: #cbd5e1;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #00f0f0, #00b8b8);
                    border: none;
                    color: #000;
                }
                .btn-primary:hover {
                    transform: scale(1.02);
                    box-shadow: 0 0 15px rgba(0, 240, 240, 0.4);
                }
                .btn-primary:active {
                    transform: scale(0.98);
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { opacity: 1; }
                }
            `}} />

            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">CONTROLS SETUP</h2>

                <div className="controls-list">
                    {controlRows.map(row => {
                        const isListening = listeningAction === row.action;
                        return (
                            <div key={row.action} className={`control-row ${isListening ? 'listening' : ''}`}>
                                <span className="control-label">{row.label}</span>
                                <button
                                    className={`key-assign-btn ${isListening ? 'active' : ''}`}
                                    onClick={() => setListeningAction(row.action)}
                                >
                                    {isListening ? 'Press a key...' : getFriendlyKeyName(currentKeys[row.action])}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="modal-actions">
                    <button className="modal-btn btn-secondary" onClick={handleReset}>
                        Default
                    </button>
                    <button className="modal-btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="modal-btn btn-primary" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
