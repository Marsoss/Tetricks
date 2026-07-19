import React, { useState, useMemo } from 'react';
import { Board } from './Board';
import { KeyMap } from '../types/settings';
import { useTetris } from '../hooks/useTetris';
import { RandomAI } from '../utils/ai/randomAI';
import { HeuristicsAI, DEFAULT_WEIGHTS } from '../utils/ai/heuristicsAI';
import geneticWeights from '../constants/best_weights.json';
import { getAggregateHeight, getHolesCount, getBumpiness } from '../utils/ai/gridAnalyzer';
import { Cell } from '../types/tetris';
import { TETROMINOS } from '../constants/tetris';

interface TetrisProps {
    onBackToHome?: () => void;
    mode?: 'classic' | 'modern';
    letAIPlay?: boolean;
    randomizer?: '7-bag' | 'nes' | 'history' | 'pure';
    keyMap: KeyMap;
    onOpenSettings: () => void;
}

type ControlEntity = 'player' | 'randomAI' | 'heuristicAI' | 'geneticAI';

const TetrominoPreview = ({ type, size = 'large' }: { type: Cell | null; size?: 'large' | 'small' | 'mini' }) => {
    const boxSize = size === 'large' ? '80px' : size === 'small' ? '55px' : '32px';
    if (!type) {
        return <div style={{ width: boxSize, height: boxSize }} />;
    }

    const shape = TETROMINOS[type as keyof typeof TETROMINOS];
    const colorMap: Record<string, string> = {
        I: '#00f0f0',
        O: '#f0f000',
        T: '#a000f0',
        S: '#00f000',
        Z: '#f00000',
        J: '#0000f0',
        L: '#f0a000',
    };
    const color = colorMap[type] || '#333';

    // Center piece
    const gridRows = shape.length;
    const gridCols = shape[0].length;
    const padRow = (4 - gridRows) / 2;
    const padCol = (4 - gridCols) / 2;

    const displayGrid = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            if (shape[r][c] !== 0) {
                const targetRow = Math.floor(padRow) + r;
                const targetCol = Math.floor(padCol) + c;
                if (targetRow >= 0 && targetRow < 4 && targetCol >= 0 && targetCol < 4) {
                    displayGrid[targetRow][targetCol] = type;
                }
            }
        }
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: size === 'large' ? '2px' : '1px',
            width: boxSize,
            height: boxSize,
            padding: size === 'large' ? '4px' : '1px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: size === 'large' ? '6px' : '4px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxSizing: 'border-box'
        }}>
            {displayGrid.flat().map((cell, idx) => (
                <div key={idx} style={{
                    backgroundColor: cell !== 0 ? color : 'transparent',
                    borderRadius: cell !== 0 ? (size === 'large' ? '2px' : '1px') : '0',
                    boxShadow: cell !== 0 && size === 'large' ? `0 0 5px ${color}` : 'none',
                    aspectRatio: '1'
                }} />
            ))}
        </div>
    );
};

export const Tetris: React.FC<TetrisProps> = ({
    onBackToHome,
    mode: initialMode = 'classic',
    letAIPlay = false,
    keyMap,
    onOpenSettings
}) => {
    // Dynamic settings states (Sprint 5.1)
    const [gameMode, setGameMode] = useState<'classic' | 'modern'>(initialMode);
    const [controlEntity, setControlEntity] = useState<ControlEntity>(() =>
        letAIPlay ? 'heuristicAI' : 'player'
    );

    // Instantiate AIs
    const activeAI = useMemo(() => {
        if (controlEntity === 'randomAI') return new RandomAI();
        if (controlEntity === 'heuristicAI') return new HeuristicsAI("IA Heuristique Fixe", DEFAULT_WEIGHTS);
        if (controlEntity === 'geneticAI') return new HeuristicsAI("IA Génétique", geneticWeights);
        return null;
    }, [controlEntity]);

    const {
        grid,
        activePiece,
        ghostY,
        isGameOver,
        isPaused,
        score,
        lines,
        level,
        comboCounter,
        backToBackActive,
        togglePause,
        restartGame,
        nextPieces,
        holdPiece,
        pieceCounts,
        ruleSetConfig,
    } = useTetris(keyMap, gameMode, controlEntity !== 'player', activeAI);

    // Compute live telemetry for stats panel
    const currentHeight = useMemo(() => getAggregateHeight(grid), [grid]);
    const currentHoles = useMemo(() => getHolesCount(grid), [grid]);
    const currentBumpiness = useMemo(() => getBumpiness(grid), [grid]);

    // CSS styles
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#0d0d0d',
        minHeight: '100vh',
        fontFamily: '"Courier New", Courier, monospace',
        color: '#fff',
        userSelect: 'none',
    };

    const headerStyle: React.CSSProperties = {
        width: '100%',
        padding: '16px 40px',
        background: 'rgba(20, 20, 20, 0.8)',
        borderBottom: '1px solid #222',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxSizing: 'border-box',
        backdropFilter: 'blur(10px)',
    };

    const selectStyle: React.CSSProperties = {
        background: '#1a1a1a',
        border: '1px solid #333',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '4px',
        fontFamily: 'inherit',
        cursor: 'pointer',
        outline: 'none',
    };

    const panelStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minWidth: '220px',
        backgroundColor: '#1a1a1a',
        padding: '20px',
        borderRadius: '8px',
        border: '2px solid #333',
    };

    const statBoxStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '12px',
        color: '#888',
        textTransform: 'uppercase',
        marginBottom: '5px',
    };

    const valueStyle: React.CSSProperties = {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#00f0f0',
    };

    const pauseButtonStyle: React.CSSProperties = {
        width: '160px',
        padding: '10px 0',
        background: 'transparent',
        border: '1.5px solid rgba(0, 240, 240, 0.3)',
        borderRadius: '6px',
        color: '#00f0f0',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    const handleHoverStart = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.borderColor = '#00f0f0';
        e.currentTarget.style.backgroundColor = 'rgba(0, 240, 240, 0.1)';
        e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 240, 0.4)';
        e.currentTarget.style.transform = 'scale(1.03)';
    };

    const handleHoverEnd = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.borderColor = 'rgba(0, 240, 240, 0.3)';
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'scale(1)';
    };

    return (
        <div style={containerStyle}>
            {/* SPRINT 5.1: High-Tech Control Room Topbar Selectors */}
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', color: '#00f0f0' }}>
                        TETRIS COCKPIT
                    </span>
                    {controlEntity !== 'player' && (
                        <span style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            letterSpacing: '1px'
                        }}>
                            AI PLAYING
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>MODE RULES:</span>
                        <select
                            value={gameMode}
                            onChange={(e) => setGameMode(e.target.value as 'classic' | 'modern')}
                            style={selectStyle}
                        >
                            <option value="classic">Classic (NES)</option>
                            <option value="modern">Modern (Guideline)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>CONTROLLER:</span>
                        <select
                            value={controlEntity}
                            onChange={(e) => setControlEntity(e.target.value as ControlEntity)}
                            style={selectStyle}
                        >
                            <option value="player">Player (Keyboard)</option>
                            <option value="randomAI">Random AI</option>
                            <option value="heuristicAI">Fixed Heuristic AI</option>
                            <option value="geneticAI">Genetic AI</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Playfield Area */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', width: '100%' }}>
                <div style={{ position: 'relative', width: '450px' }}>
                    <Board grid={grid} activePiece={activePiece} ghostY={ghostY} />

                    {/* Hold Box (Modern only) */}
                    {gameMode === 'modern' && (
                        <div style={{
                            position: 'absolute',
                            right: 'calc(100% + 40px)',
                            top: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'rgba(26, 26, 26, 0.85)',
                            border: '2px solid #333',
                            borderRadius: '8px',
                            padding: '20px',
                            width: '180px',
                            boxSizing: 'border-box',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            backdropFilter: 'blur(8px)',
                        }}>
                            <span style={labelStyle}>HOLD</span>
                            <TetrominoPreview type={holdPiece} />
                            <span style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '4px' }}>
                                Press '{(keyMap.hold || 'c').toUpperCase()}'
                            </span>
                        </div>
                    )}

                    {/* Game Over Screen */}
                    {isGameOver && (
                        <div style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(9, 9, 11, 0.9)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 1000,
                        }}>
                            <div style={{
                                width: '360px',
                                background: 'rgba(30, 20, 25, 0.85)',
                                border: '2px solid rgba(255, 0, 85, 0.3)',
                                borderRadius: '16px',
                                padding: '30px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '24px',
                                color: '#fff',
                                boxShadow: '0 0 30px rgba(255, 0, 85, 0.25)',
                            }}>
                                <div style={{
                                    fontSize: '32px',
                                    fontWeight: 'bold',
                                    color: '#ff0055',
                                    textShadow: '0 0 15px rgba(255, 0, 85, 0.6)',
                                    letterSpacing: '4px',
                                }}>
                                    GAME OVER
                                </div>

                                <div style={{
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#888' }}>SCORE</span>
                                        <span style={{ color: '#00f0f0', fontWeight: 'bold' }}>{score}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#888' }}>LINES</span>
                                        <span style={{ color: '#c084fc', fontWeight: 'bold' }}>{lines}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#888' }}>LEVEL</span>
                                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{level}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={restartGame}
                                    style={{
                                        width: '100%',
                                        padding: '12px 0',
                                        background: 'linear-gradient(135deg, #ff0055, #ff007f)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '15px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Restart
                                </button>
                                {onBackToHome && (
                                    <button onClick={onBackToHome} style={{ width: '100%', padding: '12px 0', background: 'transparent', border: '1px solid #333', color: '#94a3b8', borderRadius: '8px' }}>
                                        Back to Home
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Pause Overlay */}
                    {isPaused && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(10, 10, 15, 0.85)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '16px',
                            borderRadius: '4px',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            zIndex: 10
                        }}>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00f0f0', textShadow: '0 0 10px rgba(0, 240, 240, 0.5)', letterSpacing: '4px', marginBottom: '10px' }}>
                                PAUSE
                            </div>
                            <button onClick={togglePause} style={pauseButtonStyle} onMouseEnter={handleHoverStart} onMouseLeave={handleHoverEnd}>
                                Resume
                            </button>
                            <button onClick={restartGame} style={pauseButtonStyle} onMouseEnter={handleHoverStart} onMouseLeave={handleHoverEnd}>
                                Restart
                            </button>
                            <button onClick={onOpenSettings} style={pauseButtonStyle} onMouseEnter={handleHoverStart} onMouseLeave={handleHoverEnd}>
                                Controls
                            </button>
                            {onBackToHome && (
                                <button
                                    onClick={onBackToHome}
                                    style={{
                                        ...pauseButtonStyle,
                                        borderColor: 'rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                                        e.currentTarget.style.borderColor = '#ef4444';
                                        e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    Quit
                                </button>
                            )}
                        </div>
                    )}

                    {/* Panel 1: Score & Next pieces */}
                    <div style={{
                        ...panelStyle,
                        position: 'absolute',
                        left: 'calc(100% + 40px)',
                        top: 0,
                    }}>
                        <div style={statBoxStyle}>
                            <span style={labelStyle}>Score</span>
                            <span style={valueStyle}>{score}</span>
                        </div>

                        <div style={statBoxStyle}>
                            <span style={labelStyle}>Lines</span>
                            <span style={valueStyle}>{lines}</span>
                        </div>

                        <div style={statBoxStyle}>
                            <span style={labelStyle}>Level</span>
                            <span style={valueStyle}>{level}</span>
                        </div>

                        {/* Combo & Back-to-Back indicators (Modern only) */}
                        {ruleSetConfig.features.hasCombos && comboCounter > 0 && (
                            <div style={{
                                ...statBoxStyle,
                                background: 'rgba(0, 240, 240, 0.1)',
                                border: '1px solid rgba(0, 240, 240, 0.3)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                            }}>
                                <span style={{ ...labelStyle, color: '#00f0f0' }}>COMBO</span>
                                <span style={{ ...valueStyle, color: '#00f0f0' }}>×{comboCounter}</span>
                            </div>
                        )}
                        {ruleSetConfig.features.hasBackToBack && backToBackActive && (
                            <div style={{
                                ...statBoxStyle,
                                background: 'rgba(240, 160, 0, 0.1)',
                                border: '1px solid rgba(240, 160, 0, 0.3)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                            }}>
                                <span style={{ ...labelStyle, color: '#f0a000' }}>B2B</span>
                                <span style={{ ...valueStyle, color: '#f0a000' }}>ACTIVE</span>
                            </div>
                        )}

                        <hr style={{ borderColor: '#333', margin: '10px 0' }} />

                        {/* Dynamic next pieces layout depending on Classic/Modern rules */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
                            <span style={labelStyle}>NEXT</span>
                            {gameMode === 'modern' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
                                    <TetrominoPreview type={nextPieces[0]} size="large" />
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', width: '100%', marginTop: '4px' }}>
                                        <TetrominoPreview type={nextPieces[1]} size="small" />
                                        <TetrominoPreview type={nextPieces[2]} size="small" />
                                        <TetrominoPreview type={nextPieces[3]} size="small" />
                                    </div>
                                </div>
                            ) : (
                                <TetrominoPreview type={nextPieces[0]} size="large" />
                            )}
                        </div>

                        <hr style={{ borderColor: '#333', margin: '10px 0' }} />

                        <button onClick={togglePause} style={{ background: 'linear-gradient(135deg, #00f0f0, #00b8b8)', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', padding: '10px 0', cursor: 'pointer', transition: 'transform 0.2s', width: '100%' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                            {isPaused ? 'Resume' : 'Pause'}
                        </button>

                        {onBackToHome && (
                            <>
                                <hr style={{ borderColor: '#333', margin: '10px 0' }} />
                                <button
                                    onClick={onOpenSettings}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        color: '#888',
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.2s',
                                        width: '100%',
                                        marginBottom: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#a855f7';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#333';
                                        e.currentTarget.style.color = '#888';
                                    }}
                                >
                                    Controls
                                </button>
                                <button
                                    onClick={onBackToHome}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        color: '#888',
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#ef4444';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#333';
                                        e.currentTarget.style.color = '#888';
                                    }}
                                >
                                    Quit (Home)
                                </button>
                            </>
                        )}
                    </div>

                    {/* Panel 2: Drop Rates Panel */}
                    <div style={{
                        ...panelStyle,
                        position: 'absolute',
                        left: 'calc(100% + 300px)',
                        top: 0,
                    }}>
                        <span style={labelStyle}>Piece Stats</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as Exclude<Cell, 0>[]).map((pieceType) => {
                                const count = pieceCounts[pieceType] || 0;
                                const total = Object.values(pieceCounts).reduce((sum, c) => sum + c, 0);
                                const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';

                                const colorMap: Record<string, string> = {
                                    I: '#00f0f0', O: '#f0f000', T: '#a000f0', S: '#00f000', Z: '#f00000', J: '#0000f0', L: '#f0a000',
                                };
                                const color = colorMap[pieceType] || '#fff';
                                const colorRgbaMap: Record<string, string> = {
                                    I: 'rgba(0, 240, 240, 0.12)', O: 'rgba(240, 240, 0, 0.12)', T: 'rgba(160, 0, 240, 0.12)', S: 'rgba(0, 240, 0, 0.12)', Z: 'rgba(240, 0, 0, 0.12)', J: 'rgba(0, 0, 240, 0.12)', L: 'rgba(240, 160, 0, 0.12)',
                                };

                                return (
                                    <div key={pieceType} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '10px',
                                        background: `linear-gradient(to right, ${colorRgbaMap[pieceType]} ${rate}%, rgba(255, 255, 255, 0.02) ${rate}%)`,
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255, 255, 255, 0.05)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <TetrominoPreview type={pieceType} size="mini" />
                                            <span style={{ fontWeight: 'bold', color: color, fontSize: '14px' }}>
                                                {pieceType}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{rate}%</span>
                                            <span style={{ fontSize: '10px', color: '#666' }}>{count} drops</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SPRINT 5.2: AI Live Monitoring Dashboard Panel */}
                    {controlEntity !== 'player' && (
                        <div style={{
                            ...panelStyle,
                            position: 'absolute',
                            right: 'calc(100% + 40px)',
                            top: gameMode === 'modern' ? '240px' : '0',
                            width: '180px',
                            minWidth: '180px',
                            boxSizing: 'border-box'
                        }}>
                            <span style={labelStyle}>AI Telemetry</span>

                            <div style={statBoxStyle}>
                                <span style={labelStyle}>Total Height</span>
                                <span style={valueStyle}>{currentHeight}</span>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (currentHeight / 150) * 100)}%`,
                                        background: 'linear-gradient(to right, #4ade80, #ef4444)',
                                        transition: 'width 0.2s ease'
                                    }} />
                                </div>
                            </div>

                            <div style={statBoxStyle}>
                                <span style={labelStyle}>Holes</span>
                                <span style={{ ...valueStyle, color: currentHoles > 0 ? '#ff0055' : '#4ade80' }}>
                                    {currentHoles}
                                </span>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (currentHoles / 15) * 100)}%`,
                                        background: '#ff0055',
                                        transition: 'width 0.2s ease'
                                    }} />
                                </div>
                            </div>

                            <div style={statBoxStyle}>
                                <span style={labelStyle}>Bumpiness</span>
                                <span style={{ ...valueStyle, color: '#c084fc' }}>{currentBumpiness}</span>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (currentBumpiness / 40) * 100)}%`,
                                        background: '#c084fc',
                                        transition: 'width 0.2s ease'
                                    }} />
                                </div>
                            </div>

                            <hr style={{ borderColor: '#333', margin: '5px 0' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#666' }}>
                                <span>ACTIVE COEFFICIENTS:</span>
                                <span>• Height: {(activeAI as any).weights?.height.toFixed(2)}</span>
                                <span>• Holes: {(activeAI as any).weights?.holes.toFixed(2)}</span>
                                <span>• Bumpiness: {(activeAI as any).weights?.bumpiness.toFixed(2)}</span>
                                <span>• Lines: {(activeAI as any).weights?.lines.toFixed(2)}</span>
                                <span>• Wells: {((activeAI as any).weights?.wells ?? -0.30).toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};