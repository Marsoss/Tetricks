import React, { useState } from 'react';

interface HomeProps {
    onPlay: (settings: { 
        mode: 'classic' | 'modern'; 
        letAIPlay: boolean; 
        randomizer: '7-bag' | 'nes' | 'history' | 'pure'; 
    }) => void;
    onOpenSettings: () => void;
    onOpenTraining: () => void;
}

export const Home: React.FC<HomeProps> = ({ onPlay, onOpenSettings, onOpenTraining }) => {
    const [mode, setMode] = useState<'classic' | 'modern'>('classic');
    const [letAIPlay, setLetAIPlay] = useState<boolean>(false);
    const [randomizer, setRandomizer] = useState<'7-bag' | 'nes' | 'history' | 'pure'>('7-bag');
    
    // Hover states for elements
    const [hoveredMode, setHoveredMode] = useState<'classic' | 'modern' | null>(null);
    const [hoveredAI, setHoveredAI] = useState<boolean>(false);
    const [hoveredPlay, setHoveredPlay] = useState<boolean>(false);

    const handlePlayClick = () => {
        onPlay({ mode, letAIPlay, randomizer });
    };

    return (
        <div className="home-container">
            {/* Embedded styles for premium animations & hover effects */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulseGlow {
                    0% { box-shadow: 0 0 5px rgba(6, 182, 212, 0.4), 0 0 15px rgba(6, 182, 212, 0.2); }
                    50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.8), 0 0 35px rgba(6, 182, 212, 0.4); }
                    100% { box-shadow: 0 0 5px rgba(6, 182, 212, 0.4), 0 0 15px rgba(6, 182, 212, 0.2); }
                }
                @keyframes textGlow {
                    0% { text-shadow: 0 0 8px rgba(168, 85, 247, 0.6), 0 0 20px rgba(168, 85, 247, 0.3); }
                    50% { text-shadow: 0 0 20px rgba(168, 85, 247, 0.9), 0 0 40px rgba(168, 85, 247, 0.6); }
                    100% { text-shadow: 0 0 8px rgba(168, 85, 247, 0.6), 0 0 20px rgba(168, 85, 247, 0.3); }
                }
                @keyframes bgMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .home-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: radial-gradient(circle at center, #110e20 0%, #050508 100%);
                    font-family: 'Courier New', Courier, monospace;
                    color: #fff;
                    padding: 20px;
                    box-sizing: border-box;
                    user-select: none;
                }
                .title-container {
                    text-align: center;
                    margin-bottom: 50px;
                }
                .title-game {
                    font-size: 72px;
                    font-weight: 900;
                    letter-spacing: 8px;
                    margin: 0;
                    background: linear-gradient(90deg, #00f0f0, #a000f0, #ff007f);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: bgMove 5s linear infinite;
                    filter: drop-shadow(0 0 10px rgba(0, 240, 240, 0.3));
                }
                .subtitle {
                    font-size: 14px;
                    color: #64748b;
                    letter-spacing: 4px;
                    margin-top: 10px;
                    text-transform: uppercase;
                }
                .setup-panel {
                    width: 100%;
                    max-width: 500px;
                    background: rgba(26, 26, 36, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-radius: 16px;
                    padding: 30px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    display: flex;
                    flex-direction: column;
                    gap: 30px;
                }
                .section-title {
                    font-size: 12px;
                    text-transform: uppercase;
                    color: #94a3b8;
                    letter-spacing: 2px;
                    margin: 0 0 12px 0;
                    border-left: 3px solid #a855f7;
                    padding-left: 10px;
                }
                .modes-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .mode-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 2px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }
                .mode-card.active {
                    background: rgba(168, 85, 247, 0.1);
                    border-color: #a855f7;
                    box-shadow: 0 0 15px rgba(168, 85, 247, 0.3);
                }
                .mode-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 8px;
                    transition: color 0.3s;
                }
                .mode-card.active .mode-name {
                    color: #c084fc;
                }
                .mode-desc {
                    font-size: 11px;
                    color: #64748b;
                    line-height: 1.4;
                }
                .mode-card.active .mode-desc {
                    color: #cbd5e1;
                }
                .ai-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 2px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 16px 20px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .ai-card.active {
                    background: rgba(34, 197, 94, 0.1);
                    border-color: #22c55e;
                    box-shadow: 0 0 15px rgba(34, 197, 94, 0.25);
                }
                .ai-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .ai-title {
                    font-size: 16px;
                    font-weight: bold;
                    transition: color 0.3s;
                }
                .ai-card.active .ai-title {
                    color: #4ade80;
                }
                .ai-desc {
                    font-size: 11px;
                    color: #64748b;
                }
                .ai-card.active .ai-desc {
                    color: #cbd5e1;
                }
                .toggle-switch {
                    width: 44px;
                    height: 24px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    position: relative;
                    transition: background 0.3s;
                }
                .ai-card.active .toggle-switch {
                    background: #22c55e;
                }
                .toggle-knob {
                    width: 18px;
                    height: 18px;
                    background: #fff;
                    border-radius: 50%;
                    position: absolute;
                    top: 3px;
                    left: 3px;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .ai-card.active .toggle-knob {
                    transform: translateX(20px);
                }
                .play-btn {
                    margin-top: 10px;
                    background: linear-gradient(135deg, #06b6d4, #0891b2);
                    border: none;
                    border-radius: 12px;
                    padding: 16px 32px;
                    color: #fff;
                    font-size: 20px;
                    font-weight: bold;
                    letter-spacing: 2px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-transform: uppercase;
                    animation: pulseGlow 2.5s infinite;
                }
                .play-btn:hover {
                    background: linear-gradient(135deg, #22d3ee, #06b6d4);
                    transform: scale(1.02);
                }
                .play-btn:active {
                    transform: scale(0.98);
                }
                .settings-btn {
                    margin-top: 10px;
                    background: transparent;
                    border: 1.5px solid rgba(168, 85, 247, 0.4);
                    border-radius: 12px;
                    padding: 14px 32px;
                    color: #a855f7;
                    font-size: 16px;
                    font-weight: bold;
                    letter-spacing: 1.5px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-transform: uppercase;
                }
                .settings-btn:hover {
                    background: rgba(168, 85, 247, 0.1);
                    border-color: #a855f7;
                    color: #c084fc;
                    transform: scale(1.02);
                    box-shadow: 0 0 15px rgba(168, 85, 247, 0.3);
                }
                .settings-btn:active {
                    transform: scale(0.98);
                }
                .training-btn {
                    margin-top: 10px;
                    background: transparent;
                    border: 1.5px solid rgba(255, 0, 127, 0.4);
                    border-radius: 12px;
                    padding: 14px 32px;
                    color: #ff007f;
                    font-size: 16px;
                    font-weight: bold;
                    letter-spacing: 1.5px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-transform: uppercase;
                }
                .training-btn:hover {
                    background: rgba(255, 0, 127, 0.1);
                    border-color: #ff007f;
                    color: #ff54a9;
                    transform: scale(1.02);
                    box-shadow: 0 0 15px rgba(255, 0, 127, 0.3);
                }
                .training-btn:active {
                    transform: scale(0.98);
                }
                .select-container {
                    position: relative;
                    width: 100%;
                }
                .cyber-select {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.03);
                    border: 2px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 14px 20px;
                    color: #fff;
                    font-size: 14px;
                    font-family: inherit;
                    cursor: pointer;
                    appearance: none;
                    -webkit-appearance: none;
                    transition: all 0.3s;
                }
                .cyber-select:hover, .cyber-select:focus {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: #a855f7;
                    box-shadow: 0 0 15px rgba(168, 85, 247, 0.2);
                    outline: none;
                }
                .cyber-select option {
                    background: #110e20;
                    color: #fff;
                }
                .select-arrow {
                    position: absolute;
                    right: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #64748b;
                    pointer-events: none;
                    font-size: 12px;
                }
                .randomizer-desc {
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 10px;
                    line-height: 1.5;
                    border-left: 2px solid #00f0f0;
                    padding-left: 10px;
                }
            `}} />

            <div className="title-container">
                <h1 className="title-game">TETRIS</h1>
                <div className="subtitle">Cyber Edition</div>
            </div>

            <div className="setup-panel">
                {/* 1. Mode selection */}
                <div>
                    <h3 className="section-title">Game Mode</h3>
                    <div className="modes-grid">
                        <div 
                            className={`mode-card ${mode === 'classic' ? 'active' : ''}`}
                            onClick={() => setMode('classic')}
                            onMouseEnter={() => setHoveredMode('classic')}
                            onMouseLeave={() => setHoveredMode(null)}
                            style={hoveredMode === 'classic' && mode !== 'classic' ? {
                                borderColor: 'rgba(168, 85, 247, 0.4)',
                                background: 'rgba(255, 255, 255, 0.05)'
                            } : {}}
                        >
                            <span className="mode-name">Classic</span>
                            <span className="mode-desc">Retro rules, progressive speed curve, and classic scoring system.</span>
                        </div>
                        
                        <div 
                            className={`mode-card ${mode === 'modern' ? 'active' : ''}`}
                            onClick={() => setMode('modern')}
                            onMouseEnter={() => setHoveredMode('modern')}
                            onMouseLeave={() => setHoveredMode(null)}
                            style={hoveredMode === 'modern' && mode !== 'modern' ? {
                                borderColor: 'rgba(168, 85, 247, 0.4)',
                                background: 'rgba(255, 255, 255, 0.05)'
                            } : {}}
                        >
                            <span className="mode-name">Modern</span>
                            <span className="mode-desc">Advanced rotation system, Hold piece, extended preview, and T-spins.</span>
                        </div>
                    </div>
                </div>

                {/* 2. AI Selection */}
                <div>
                    <h3 className="section-title">Autopilot</h3>
                    <div 
                        className={`ai-card ${letAIPlay ? 'active' : ''}`}
                        onClick={() => setLetAIPlay(!letAIPlay)}
                        onMouseEnter={() => setHoveredAI(true)}
                        onMouseLeave={() => setHoveredAI(false)}
                        style={hoveredAI && !letAIPlay ? {
                            borderColor: 'rgba(34, 197, 94, 0.4)',
                            background: 'rgba(255, 255, 255, 0.05)'
                        } : {}}
                    >
                        <div className="ai-info">
                            <span className="ai-title">Let AI Play</span>
                            <span className="ai-desc">Enable an intelligent agent to control the Tetris blocks.</span>
                        </div>
                        <div className="toggle-switch">
                            <div className="toggle-knob" />
                        </div>
                    </div>
                </div>

                {/* 3. Randomizer selection */}
                <div>
                    <h3 className="section-title">Randomizer</h3>
                    <div className="select-container">
                        <select 
                            value={randomizer} 
                            onChange={(e) => setRandomizer(e.target.value as any)}
                            className="cyber-select"
                        >
                            <option value="7-bag">7-Bag Randomizer (Modern Guideline)</option>
                            <option value="nes">NES Randomizer (Classic 1989)</option>
                            <option value="history">History-Based (Anti-Frustration)</option>
                            <option value="pure">Pure Random (Uniform Chaos)</option>
                        </select>
                        <div className="select-arrow">▼</div>
                    </div>
                    <div className="randomizer-desc">
                        {randomizer === '7-bag' && "Modern official Guideline standard. Uses a shuffled bag of all 7 blocks to guarantee perfectly balanced distribution."}
                        {randomizer === 'nes' && "1989 Retro NES logic. Rolls a duplicate block twice before giving up, creating a chaotic classic feel with feared droughts."}
                        {randomizer === 'history' && "Advanced anti-frustration system. Remembers the last 4 blocks and retries up to 6 times to avoid duplicates, keeping gameplay varied."}
                        {randomizer === 'pure' && "No memory. Every block is completely random. Often creates frustrating repeat streaks and is avoided by pros."}
                    </div>
                </div>

                {/* 4. Play Action */}
                <button 
                    className="play-btn"
                    onClick={handlePlayClick}
                    onMouseEnter={() => setHoveredPlay(true)}
                    onMouseLeave={() => setHoveredPlay(false)}
                    style={hoveredPlay ? {
                        animation: 'none',
                        boxShadow: '0 0 25px rgba(6, 182, 212, 1), 0 0 45px rgba(6, 182, 212, 0.5)'
                    } : {}}
                >
                    Play
                </button>

                <button 
                    className="settings-btn"
                    onClick={onOpenSettings}
                >
                    Controls
                </button>

                <button 
                    className="training-btn"
                    onClick={onOpenTraining}
                >
                    Train AI
                </button>
            </div>
        </div>
    );
};
