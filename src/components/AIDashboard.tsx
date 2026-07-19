import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, 
    Pause, 
    Square, 
    ArrowLeft, 
    Cpu, 
    Settings, 
    Award, 
    Activity 
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend 
} from 'recharts';
import { GRID_WIDTH, BUFFER_ZONE } from '../constants/tetris';
import { Cell as CellType, Grid } from '../types/tetris';
import { Cell } from './Cell';
import { createEmptyGrid } from '../utils/tetris';

interface AIDashboardProps {
    onBackToHome: () => void;
}

export const AIDashboard: React.FC<AIDashboardProps> = ({ onBackToHome }) => {
    const workerRef = useRef<Worker | null>(null);

    // Main Control State
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [trainingMethod, setTrainingMethod] = useState<'dqn' | 'genetic'>('genetic');
    const [speed, setSpeed] = useState<'max' | 'realtime'>('realtime');

    // Hyperparameters State
    const [dqnParams, setDqnParams] = useState({
        learningRate: 0.001,
        gamma: 0.90,
        batchSize: 64,
        epsilon: 1.0,
        epsilonDecay: 0.995,
        targetUpdateFrequency: 1000
    });

    const [gaParams, setGaParams] = useState({
        populationSize: 40,
        elitismCount: 8,
        mutationRate: 0.15,
        maxPiecesPerGame: 1000
    });

    // Game view state
    const [gameGrid, setGameGrid] = useState<Grid>(() => createEmptyGrid());
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [pieceType, setPieceType] = useState<CellType>(0);
    const [nextPieceType, setNextPieceType] = useState<CellType>(0);
    const [piecesPlaced, setPiecesPlaced] = useState(0);

    // Metrics state
    const [metricsData, setMetricsData] = useState<any>({
        gamesPlayed: 0,
        totalSteps: 0,
        epsilon: 1.0,
        bestScore: 0,
        averageScore: 0,
        loss: 0,
        generation: 0,
        currentGenomeIndex: 0,
        populationSize: 40
    });

    // Chart Data States
    const [dqnChartData, setDqnChartData] = useState<{ game: number; score: number }[]>([]);
    const [lossChartData, setLossChartData] = useState<{ step: number; loss: number }[]>([]);
    const [gaChartData, setGaChartData] = useState<{ generation: number; bestScore: number; averageScore: number }[]>([]);

    // Clean up worker on unmount
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const startTraining = () => {
        if (workerRef.current) {
            workerRef.current.terminate();
        }

        // Create Web Worker using Vite URL syntax
        workerRef.current = new Worker(
            new URL('../workers/tetrisTraining.worker.ts', import.meta.url),
            { type: 'module' }
        );

        workerRef.current.onmessage = (e: MessageEvent) => {
            const { type, method, metrics, gameView } = e.data;

            if (type === 'TRAINING_STATUS' || type === 'GAME_OVER' || type === 'GENERATION_OVER') {
                if (gameView) {
                    setGameGrid(gameView.grid);
                    setScore(gameView.score);
                    setLines(gameView.lines);
                    setPieceType(gameView.pieceType);
                    setNextPieceType(gameView.nextPieceType);
                    setPiecesPlaced(gameView.piecesPlaced);
                }

                if (metrics) {
                    setMetricsData(metrics);

                    // Update Recharts Chart Histories
                    if (method === 'dqn') {
                        if (metrics.recentScores) {
                            const scoreHistory = metrics.recentScores.map((sc: number, idx: number) => ({
                                game: idx + 1,
                                score: sc
                            }));
                            setDqnChartData(scoreHistory);
                        }
                        if (metrics.recentLoss) {
                            const lossHistory = metrics.recentLoss.map((ls: number, idx: number) => ({
                                step: idx + 1,
                                loss: ls
                            }));
                            setLossChartData(lossHistory);
                        }
                    } else if (method === 'genetic') {
                        if (metrics.recentBestScores && metrics.recentAverageScores) {
                            const history = metrics.recentBestScores.map((best: number, idx: number) => ({
                                generation: idx + 1,
                                bestScore: best,
                                averageScore: metrics.recentAverageScores[idx] || 0
                            }));
                            setGaChartData(history);
                        }
                    }
                }
            }
        };

        setIsRunning(true);
        setIsPaused(false);

        // Send start request
        workerRef.current.postMessage({
            action: 'START_TRAINING',
            method: trainingMethod,
            params: {
                speed,
                reset: true,
                // DQN
                learningRate: Number(dqnParams.learningRate),
                gamma: Number(dqnParams.gamma),
                batchSize: Number(dqnParams.batchSize),
                epsilon: Number(dqnParams.epsilon),
                epsilonDecay: Number(dqnParams.epsilonDecay),
                targetUpdateFrequency: Number(dqnParams.targetUpdateFrequency),
                // GA
                populationSize: Number(gaParams.populationSize),
                elitismCount: Number(gaParams.elitismCount),
                mutationRate: Number(gaParams.mutationRate),
                maxPiecesPerGame: trainingMethod === 'dqn' ? 2000 : Number(gaParams.maxPiecesPerGame)
            }
        });
    };

    const pauseTraining = () => {
        if (!workerRef.current) return;
        workerRef.current.postMessage({ action: 'PAUSE_TRAINING' });
        setIsPaused(true);
    };

    const resumeTraining = () => {
        if (!workerRef.current) return;
        workerRef.current.postMessage({ action: 'RESUME_TRAINING' });
        setIsPaused(false);
    };

    const stopTraining = () => {
        if (workerRef.current) {
            workerRef.current.postMessage({ action: 'STOP_TRAINING' });
            workerRef.current.terminate();
            workerRef.current = null;
        }
        setIsRunning(false);
        setIsPaused(false);
        setGameGrid(createEmptyGrid());
    };

    const handleSpeedToggle = (newSpeed: 'max' | 'realtime') => {
        setSpeed(newSpeed);
        if (workerRef.current && isRunning) {
            workerRef.current.postMessage({
                action: 'UPDATE_PARAMS',
                method: trainingMethod,
                params: { speed: newSpeed }
            });
        }
    };

    const handleEpsilonSlider = (val: number) => {
        setDqnParams(prev => ({ ...prev, epsilon: val }));
        if (workerRef.current && isRunning && trainingMethod === 'dqn') {
            workerRef.current.postMessage({
                action: 'UPDATE_PARAMS',
                method: 'dqn',
                params: { epsilon: val }
            });
        }
    };

    return (
        <div className="dashboard-container">
            {/* Cyberpunk CSS Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes neonPulse {
                    0% { box-shadow: 0 0 5px rgba(6, 182, 212, 0.4), 0 0 10px rgba(6, 182, 212, 0.2); }
                    50% { box-shadow: 0 0 15px rgba(6, 182, 212, 0.6), 0 0 25px rgba(6, 182, 212, 0.3); }
                    100% { box-shadow: 0 0 5px rgba(6, 182, 212, 0.4), 0 0 10px rgba(6, 182, 212, 0.2); }
                }
                .dashboard-container {
                    min-height: 100vh;
                    background: radial-gradient(circle at center, #0f0a1c 0%, #030206 100%);
                    font-family: 'Courier New', Courier, monospace;
                    color: #e2e8f0;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    box-sizing: border-box;
                    user-select: none;
                }
                .dashboard-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding-bottom: 16px;
                }
                .back-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #94a3b8;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .back-btn:hover {
                    color: #fff;
                    border-color: #00f0f0;
                    box-shadow: 0 0 10px rgba(0, 240, 240, 0.3);
                }
                .header-title {
                    font-size: 28px;
                    font-weight: 900;
                    letter-spacing: 4px;
                    margin: 0;
                    background: linear-gradient(90deg, #00f0f0, #a000f0, #ff007f);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    text-transform: uppercase;
                }
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 320px 1fr 340px;
                    gap: 24px;
                    flex: 1;
                }
                @media (max-width: 1100px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .panel-card {
                    background: rgba(26, 20, 42, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 20px;
                    backdrop-filter: blur(8px);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .panel-title {
                    font-size: 14px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: #00f0f0;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .control-row {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .control-label {
                    font-size: 11px;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .select-input, .number-input {
                    background: #151025;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-family: inherit;
                    outline: none;
                }
                .select-input:focus, .number-input:focus {
                    border-color: #00f0f0;
                }
                .btn-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                .primary-btn {
                    background: linear-gradient(135deg, #00f0f0 0%, #0077ff 100%);
                    border: none;
                    color: #000;
                    font-weight: bold;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .primary-btn:hover {
                    box-shadow: 0 0 15px rgba(0, 240, 240, 0.6);
                    transform: translateY(-1px);
                }
                .danger-btn {
                    background: linear-gradient(135deg, #ff007f 0%, #a000f0 100%);
                    border: none;
                    color: #fff;
                    font-weight: bold;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .danger-btn:hover {
                    box-shadow: 0 0 15px rgba(255, 0, 127, 0.6);
                    transform: translateY(-1px);
                }
                .secondary-btn {
                    background: #251d3a;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #fff;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .secondary-btn:hover {
                    background: #352b52;
                }
                .speed-tabs {
                    display: flex;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px;
                    overflow: hidden;
                }
                .speed-tab {
                    flex: 1;
                    padding: 8px;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    font-family: inherit;
                    text-align: center;
                    font-size: 12px;
                }
                .speed-tab.active {
                    background: #00f0f0;
                    color: #000;
                    font-weight: bold;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }
                .stat-card {
                    background: #140e24;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .stat-val {
                    font-size: 18px;
                    font-weight: bold;
                    color: #fff;
                }
                .stat-lbl {
                    font-size: 10px;
                    color: #64748b;
                    text-transform: uppercase;
                }
                .center-column {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }
                .board-preview-container {
                    animation: neonPulse 3s infinite;
                    border: 4px solid #1e293b;
                    border-radius: 8px;
                    overflow: hidden;
                    background-color: #05050a;
                    padding: 4px;
                }
                .preview-info {
                    display: flex;
                    width: 240px;
                    justify-content: space-between;
                    background: rgba(30, 41, 59, 0.4);
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                }
                .chart-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .recharts-default-tooltip {
                    background-color: #140e24 !important;
                    border: 1px solid #00f0f0 !important;
                    border-radius: 6px;
                }
                .slider-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .slider-val {
                    font-size: 12px;
                    color: #00f0f0;
                    width: 40px;
                }
                .slider-input {
                    flex: 1;
                    accent-color: #00f0f0;
                }
            `}} />

            {/* Header */}
            <div className="dashboard-header">
                <button className="back-btn" onClick={onBackToHome}>
                    <ArrowLeft size={16} /> Back
                </button>
                <h1 className="header-title">AI Training Dashboard</h1>
                <div style={{ width: 100 }} /> {/* Spacer */}
            </div>

            {/* Content Area */}
            <div className="dashboard-grid">
                
                {/* Left Column: Configuration & Controls */}
                <div className="panel-card">
                    <h2 className="panel-title">
                        <Cpu size={18} /> Algorithm
                    </h2>

                    {/* Method Choice */}
                    <div className="control-row">
                        <span className="control-label">Method</span>
                        <select 
                            className="select-input"
                            value={trainingMethod}
                            onChange={(e) => setTrainingMethod(e.target.value as 'dqn' | 'genetic')}
                            disabled={isRunning}
                        >
                            <option value="genetic">Genetic Algorithm</option>
                            <option value="dqn">Deep Q-Learning (DQN)</option>
                        </select>
                    </div>

                    {/* Render Speed */}
                    <div className="control-row">
                        <span className="control-label">Render Speed</span>
                        <div className="speed-tabs">
                            <button 
                                className={`speed-tab ${speed === 'realtime' ? 'active' : ''}`}
                                onClick={() => handleSpeedToggle('realtime')}
                            >
                                Real-time
                            </button>
                            <button 
                                className={`speed-tab ${speed === 'max' ? 'active' : ''}`}
                                onClick={() => handleSpeedToggle('max')}
                            >
                                Max Speed
                            </button>
                        </div>
                    </div>

                    <h2 className="panel-title">
                        <Settings size={18} /> Hyperparameters
                    </h2>

                    {/* GA Hyperparameters */}
                    {trainingMethod === 'genetic' && (
                        <>
                            <div className="control-row">
                                <span className="control-label">Population Size</span>
                                <input 
                                    type="number" 
                                    className="number-input"
                                    value={gaParams.populationSize}
                                    onChange={(e) => setGaParams(p => ({ ...p, populationSize: Math.max(2, Number(e.target.value)) }))}
                                    disabled={isRunning}
                                />
                            </div>
                            <div className="control-row">
                                <span className="control-label">Elitism (Keep Top N)</span>
                                <input 
                                    type="number" 
                                    className="number-input"
                                    value={gaParams.elitismCount}
                                    onChange={(e) => setGaParams(p => ({ ...p, elitismCount: Math.max(0, Number(e.target.value)) }))}
                                    disabled={isRunning}
                                />
                            </div>
                            <div className="control-row">
                                <span className="control-label">Mutation Rate (0-1)</span>
                                <input 
                                    type="number" 
                                    step="0.05"
                                    min="0"
                                    max="1"
                                    className="number-input"
                                    value={gaParams.mutationRate}
                                    onChange={(e) => setGaParams(p => ({ ...p, mutationRate: Number(e.target.value) }))}
                                    disabled={isRunning}
                                />
                            </div>
                            <div className="control-row">
                                <span className="control-label">Max Pieces / Game</span>
                                <input 
                                    type="number" 
                                    className="number-input"
                                    value={gaParams.maxPiecesPerGame}
                                    onChange={(e) => setGaParams(p => ({ ...p, maxPiecesPerGame: Number(e.target.value) }))}
                                    disabled={isRunning}
                                />
                            </div>
                        </>
                    )}

                    {/* DQN Hyperparameters */}
                    {trainingMethod === 'dqn' && (
                        <>
                            <div className="control-row">
                                <span className="control-label">Learning Rate</span>
                                <input 
                                    type="number" 
                                    step="0.0005"
                                    className="number-input"
                                    value={dqnParams.learningRate}
                                    onChange={(e) => setDqnParams(p => ({ ...p, learningRate: Number(e.target.value) }))}
                                    disabled={isRunning}
                                />
                            </div>
                            <div className="control-row">
                                <span className="control-label">Discount Factor (Gamma)</span>
                                <input 
                                    type="number" 
                                    step="0.05"
                                    className="number-input"
                                    value={dqnParams.gamma}
                                    onChange={(e) => setDqnParams(p => ({ ...p, gamma: Number(e.target.value) }))}
                                    disabled={isRunning}
                                />
                            </div>
                            <div className="control-row">
                                <span className="control-label">Batch Size</span>
                                <input 
                                    type="number" 
                                    className="number-input"
                                    value={dqnParams.batchSize}
                                    onChange={(e) => setDqnParams(p => ({ ...p, batchSize: Number(e.target.value) }))}
                                    disabled={isRunning}
                                />
                            </div>
                            <div className="control-row">
                                <span className="control-label">Exploration (Epsilon)</span>
                                <div className="slider-container">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.01"
                                        className="slider-input"
                                        value={dqnParams.epsilon}
                                        onChange={(e) => handleEpsilonSlider(Number(e.target.value))}
                                    />
                                    <span className="slider-val">{dqnParams.epsilon.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="control-row">
                                <span className="control-label">Target Sync (steps)</span>
                                <input 
                                    type="number" 
                                    className="number-input"
                                    value={dqnParams.targetUpdateFrequency}
                                    onChange={(e) => setDqnParams(p => ({ ...p, targetUpdateFrequency: Number(e.target.value) }))}
                                    disabled={isRunning}
                                />
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {!isRunning ? (
                            <button className="primary-btn" onClick={startTraining}>
                                <Play size={16} /> Start
                            </button>
                        ) : (
                            <div className="btn-group">
                                {isPaused ? (
                                    <button className="secondary-btn" onClick={resumeTraining}>
                                        <Play size={16} /> Resume
                                    </button>
                                ) : (
                                    <button className="secondary-btn" onClick={pauseTraining}>
                                        <Pause size={16} /> Pause
                                    </button>
                                )}
                                <button className="danger-btn" onClick={stopTraining}>
                                    <Square size={16} /> Stop
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle Column: Live Game Preview & Performance Stats */}
                <div className="center-column">
                    <div className="board-preview-container">
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
                            width: '240px',
                            border: '3px solid #334155',
                            backgroundColor: '#050508'
                        }}>
                            {gameGrid.slice(BUFFER_ZONE).flatMap((row, y) =>
                                row.map((cell, x) => (
                                    <Cell key={`${y}-${x}`} type={cell} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Preview Info (pieces, placed, active) */}
                    <div className="preview-info" style={{ flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>Pieces Placed: <span style={{ color: '#00f0f0' }}>{piecesPlaced}</span></div>
                            <div>Current Score: <span style={{ color: '#ff007f' }}>{score}</span></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>Lines: <span style={{ color: '#10b981' }}>{lines}</span></div>
                            <div>Active / Next Piece: <span style={{ color: '#a855f7' }}>{pieceType || 'None'} / {nextPieceType || 'None'}</span></div>
                        </div>
                    </div>

                    {/* Statistics Panel */}
                    <div className="panel-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                        <h2 className="panel-title">
                            <Activity size={18} /> Training Status
                        </h2>

                        <div className="stats-grid">
                            {trainingMethod === 'genetic' ? (
                                <>
                                    <div className="stat-card">
                                        <span className="stat-val">{metricsData.generation}</span>
                                        <span className="stat-lbl">Generation</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-val">{metricsData.currentGenomeIndex} / {metricsData.populationSize}</span>
                                        <span className="stat-lbl">Current Genome</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-val">{metricsData.bestScore}</span>
                                        <span className="stat-lbl">Best Score</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-val">{Math.round(metricsData.averageScore)}</span>
                                        <span className="stat-lbl">Average Score</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="stat-card">
                                        <span className="stat-val">{metricsData.gamesPlayed}</span>
                                        <span className="stat-lbl">Games Played</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-val">{metricsData.totalSteps}</span>
                                        <span className="stat-lbl">Total Steps</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-val">{metricsData.epsilon?.toFixed(2)}</span>
                                        <span className="stat-lbl">Epsilon</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-val">{metricsData.loss?.toFixed(4) || 'N/A'}</span>
                                        <span className="stat-lbl">Loss</span>
                                    </div>
                                    <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                                        <span className="stat-val">{metricsData.bestScore} (Avg: {Math.round(metricsData.averageScore)})</span>
                                        <span className="stat-lbl">Max Score (Average)</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Graphs Panel */}
                <div className="chart-panel">
                    
                    {/* Graph: Score History */}
                    <div className="panel-card" style={{ flex: 1 }}>
                        <h2 className="panel-title">
                            <Award size={18} /> Score History
                        </h2>
                        <div style={{ width: '100%', height: 230 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {trainingMethod === 'genetic' ? (
                                    <LineChart data={gaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis dataKey="generation" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                                        <YAxis stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#151025', borderColor: '#00f0f0' }} />
                                        <Legend style={{ fontSize: 10 }} />
                                        <Line type="monotone" dataKey="bestScore" name="Best" stroke="#00f0f0" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="averageScore" name="Average" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                                    </LineChart>
                                ) : (
                                    <LineChart data={dqnChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis dataKey="game" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                                        <YAxis stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#151025', borderColor: '#ff007f' }} />
                                        <Line type="monotone" dataKey="score" name="Score" stroke="#ff007f" strokeWidth={2} dot={false} />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Graph: DQN Loss / Secondary info */}
                    {trainingMethod === 'dqn' && (
                        <div className="panel-card" style={{ flex: 1 }}>
                            <h2 className="panel-title">
                                <Activity size={18} /> Loss History
                            </h2>
                            <div style={{ width: '100%', height: 230 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={lossChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis dataKey="step" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                                        <YAxis stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#151025', borderColor: '#eab308' }} />
                                        <Line type="monotone" dataKey="loss" name="Loss" stroke="#eab308" strokeWidth={1.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {trainingMethod === 'genetic' && (
                        <div className="panel-card" style={{ flex: 1, justifyContent: 'center' }}>
                            <h2 className="panel-title">
                                <Activity size={18} /> Best Genome Weights
                            </h2>
                            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p>The genetic algorithm optimizes the coefficients of the heuristic evaluation function:</p>
                                <div style={{ background: '#140e24', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>Aggregate Height: <span style={{ color: '#ef4444', float: 'right' }}>Negative (Avoid height)</span></div>
                                    <div>Holes: <span style={{ color: '#f59e0b', float: 'right' }}>Negative (Avoid holes)</span></div>
                                    <div>Bumpiness: <span style={{ color: '#3b82f6', float: 'right' }}>Negative (Keep flat)</span></div>
                                    <div>Well Depth: <span style={{ color: '#ec4899', float: 'right' }}>Negative (Avoid deep wells)</span></div>
                                    <div>Lines Cleared: <span style={{ color: '#10b981', float: 'right' }}>Positive (Maximize score)</span></div>
                                </div>
                                <p>Fitness is evaluated by the maximum score achieved. Evolution eliminates poor weight combinations to converge toward optimal values.</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
