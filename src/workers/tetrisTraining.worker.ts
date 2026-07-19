import * as tf from '@tensorflow/tfjs';
import { GRID_WIDTH } from '../constants/tetris';
import { Grid, Cell } from '../types/tetris';
import { Genome } from '../types/tetrisAI';
import { createEmptyGrid, getTetrominoByType } from '../utils/tetris';
import { hasCollision, mergePieceIntoGrid, clearLines, rotatePiece, checkGameOver } from '../utils/tetrisLogic';
import { getAggregateHeight, getHolesCount, getBumpiness, getLinesCleared, getWellsDepth } from '../utils/ai/gridAnalyzer';
import { evolvePopulation, createRandomGenome } from '../utils/ai/geneticTrainer';
import { modernRules } from '../utils/rules/modernRules';
import { MODERN_GUIDELINE_CONFIG } from '../config/scoreConfig';

// Initialize TensorFlow.js backend as CPU to be safe inside Web Worker context
try {
    tf.setBackend('cpu');
} catch (e) {
    console.error('Failed to set tfjs CPU backend, falling back to default:', e);
}

interface ValidMove {
    rotationCount: number;
    targetX: number;
    resultingGrid: Grid;
    linesCleared: number;
    features: number[]; // [height, holes, bumpiness, linesCleared, wells]
}

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getMaxHeight(grid: Grid): number {
    const height = grid.length;
    const width = grid[0].length;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] !== 0) {
                return height - y;
            }
        }
    }
    return 0;
}

function normalizeFeatures(features: number[]): number[] {
    return [
        features[0] / 200, // height (max theoretical height = 20 * 10 = 200)
        features[1] / 20,  // holes (max theoretical holes around 20)
        features[2] / 20,  // bumpiness
        features[3] / 4,   // lines cleared
        features[4] / 20   // wells depth (max well depth around 20)
    ];
}

function getReward(linesCleared: number, isGameOver: boolean): number {
    if (isGameOver) {
        return -1.0;
    }
    // Scaled exponential rewards with single/double penalties to prioritize Tetris (75x greater for 4 lines vs 1 line absolute)
    const lineRewards = [0, -0.12, -0.03, 0.15, 7.50];
    return lineRewards[linesCleared] + 0.01; // +0.01 survival reward
}

function getValidMoves(grid: Grid, pieceType: Cell): ValidMove[] {
    const validMoves: ValidMove[] = [];

    // Try all 4 orientations
    for (let rot = 0; rot < 4; rot++) {
        let piece = getTetrominoByType(pieceType);
        for (let r = 0; r < rot; r++) {
            piece.shape = rotatePiece(piece.shape, 'CW');
        }

        // Try columns from -2 to 10 (Tetris grid is 10 wide, columns are 0-indexed)
        for (let x = -3; x < GRID_WIDTH; x++) {
            piece.position.x = x;
            piece.position.y = 0;

            // Skip if collides immediately at spawn
            if (hasCollision(piece.shape, piece.position, grid)) {
                continue;
            }

            // Drop to the bottom
            let y = 0;
            while (!hasCollision(piece.shape, { x, y: y + 1 }, grid)) {
                y++;
            }

            const placedPiece = {
                ...piece,
                position: { x, y }
            };

            const simulatedGrid = mergePieceIntoGrid(grid, placedPiece);
            const linesCleared = getLinesCleared(simulatedGrid);
            const { newGrid } = clearLines(simulatedGrid);

            const height = getAggregateHeight(newGrid);
            const holes = getHolesCount(newGrid);
            const bumpiness = getBumpiness(newGrid);
            const wells = getWellsDepth(newGrid);

            validMoves.push({
                rotationCount: rot,
                targetX: x,
                resultingGrid: newGrid,
                linesCleared,
                features: [height, holes, bumpiness, linesCleared, wells]
            });
        }
    }

    return validMoves;
}

function customHuberLoss(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.losses.huberLoss(yTrue, yPred);
}

// -------------------------------------------------------------
// DEEP Q-LEARNING AGENT
// -------------------------------------------------------------
class DQNAgent {
    public model!: tf.Sequential;
    public targetModel!: tf.Sequential;
    public replayBuffer: any[] = [];
    public learningRate: number;
    public gamma: number;
    public epsilon: number;
    public epsilonMin: number;
    public epsilonDecay: number;
    public batchSize: number;
    public targetUpdateFrequency: number;
    public stepsCount: number = 0;

    constructor(params: any = {}) {
        this.learningRate = params.learningRate || 0.00025; // Standard stable DQN learning rate
        this.gamma = params.gamma || 0.90;
        this.epsilon = params.epsilon !== undefined ? params.epsilon : 1.0;
        this.epsilonMin = params.epsilonMin || 0.05;
        this.epsilonDecay = params.epsilonDecay || 0.995;
        this.batchSize = params.batchSize || 64;
        this.targetUpdateFrequency = params.targetUpdateFrequency || 1000;

        this.initModels();
    }

    private initModels() {
        // Main Network
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 64, inputShape: [5], activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: 1 }));
        this.model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: customHuberLoss // stable loss function function reference
        });

        // Target Network
        this.targetModel = tf.sequential();
        this.targetModel.add(tf.layers.dense({ units: 64, inputShape: [5], activation: 'relu' }));
        this.targetModel.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        this.targetModel.add(tf.layers.dense({ units: 1 }));

        this.updateTargetModel();
    }

    public updateTargetModel() {
        this.targetModel.setWeights(this.model.getWeights());
    }

    public remember(state: number[], reward: number, nextStateChoices: number[][], done: boolean) {
        this.replayBuffer.push({ state, reward, nextStateChoices, done });
        if (this.replayBuffer.length > 10000) {
            this.replayBuffer.shift();
        }
    }

    public async train(): Promise<number | null> {
        // Burn-in phase: wait until we have a diverse set of 1,000 experiences before starting gradient descent
        if (this.replayBuffer.length < 1000) {
            return null;
        }

        // Random sample minibatch
        const batch: any[] = [];
        for (let i = 0; i < this.batchSize; i++) {
            const index = Math.floor(Math.random() * this.replayBuffer.length);
            batch.push(this.replayBuffer[index]);
        }

        // Batch predict next Q-values for performance
        const flatNextChoices: number[][] = [];
        const nextChoicesLengths: number[] = [];
        for (const transition of batch) {
            if (!transition.done && transition.nextStateChoices.length > 0) {
                flatNextChoices.push(...transition.nextStateChoices);
                nextChoicesLengths.push(transition.nextStateChoices.length);
            } else {
                nextChoicesLengths.push(0);
            }
        }

        let flatQValues: any = [];
        if (flatNextChoices.length > 0) {
            const qTensor = tf.tidy(() => {
                const tensor = tf.tensor2d(flatNextChoices);
                return this.targetModel.predict(tensor) as tf.Tensor;
            });
            flatQValues = await qTensor.data();
            qTensor.dispose();
        }

        let flatIdx = 0;
        const targets: number[] = [];
        const states: number[][] = [];

        for (let i = 0; i < batch.length; i++) {
            const transition = batch[i];
            states.push(transition.state);

            if (transition.done) {
                targets.push(transition.reward);
            } else {
                const len = nextChoicesLengths[i];
                if (len === 0) {
                    targets.push(transition.reward);
                } else {
                    let maxQ = -Infinity;
                    for (let j = 0; j < len; j++) {
                        const q = flatQValues[flatIdx++];
                        if (q > maxQ) {
                            maxQ = q;
                        }
                    }
                    targets.push(transition.reward + this.gamma * maxQ);
                }
            }
        }

        // Run gradient descent
        const statesTensor = tf.tensor2d(states);
        const targetsTensor = tf.tensor2d(targets, [targets.length, 1]);

        const info = await this.model.fit(statesTensor, targetsTensor, {
            epochs: 1,
            batchSize: this.batchSize,
            verbose: 0
        });

        statesTensor.dispose();
        targetsTensor.dispose();

        this.stepsCount++;
        if (this.stepsCount % this.targetUpdateFrequency === 0) {
            this.updateTargetModel();
        }

        return info.history.loss[0] as number;
    }

    public decayEpsilon() {
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    }
}

// -------------------------------------------------------------
// WORKER CONTROL VARIABLES
// -------------------------------------------------------------
let isRunning = false;
let isPaused = false;
let speed: 'max' | 'realtime' = 'realtime';

// Training metrics memory
let dqnAgent: DQNAgent | null = null;
let currentPopulation: Genome[] = [];
let generation = 0;
let currentGenomeIdx = 0;
let totalDQNSteps = 0;
let totalDQNGames = 0;
let recentDQNScores: number[] = [];
let recentDQNLosses: number[] = [];
let bestDQNScore = 0;

let recentBestScores: number[] = [];
let recentAvgScores: number[] = [];

// -------------------------------------------------------------
// TRAINING RUNNERS
// -------------------------------------------------------------
async function runDQNTraining(params: any) {
    if (!dqnAgent || params.reset) {
        dqnAgent = new DQNAgent(params);
        if (params.reset) {
            totalDQNGames = 0;
            totalDQNSteps = 0;
            recentDQNScores = [];
            recentDQNLosses = [];
            bestDQNScore = 0;
        }
    } else {
        // Adjust params on the fly
        if (params.learningRate !== undefined) dqnAgent.learningRate = params.learningRate;
        if (params.gamma !== undefined) dqnAgent.gamma = params.gamma;
        if (params.batchSize !== undefined) dqnAgent.batchSize = params.batchSize;
        if (params.targetUpdateFrequency !== undefined) dqnAgent.targetUpdateFrequency = params.targetUpdateFrequency;
    }

    const maxPieces = params.maxPiecesPerGame ?? 2000;
    isRunning = true;
    isPaused = false;

    let grid = createEmptyGrid();
    let gameScore = 0;
    let gameLines = 0;
    let piecesPlaced = 0;
    let gameOver = false;
    let bag: Cell[] = [];

    // Queue of pieces
    let nextPieces: Cell[] = [];
    for (let i = 0; i < 5; i++) {
        const res = modernRules.getRandomTetromino(bag);
        nextPieces.push(res.nextPiece);
        bag = res.newBag;
    }

    while (isRunning) {
        if (isPaused) {
            await sleep(100);
            continue;
        }

        if (gameOver || piecesPlaced >= maxPieces) {
            totalDQNGames++;
            recentDQNScores.push(gameScore);
            if (recentDQNScores.length > 50) recentDQNScores.shift();
            if (gameScore > bestDQNScore) bestDQNScore = gameScore;

            dqnAgent.decayEpsilon();

            // Notify UI of game over and state metrics
            postMessage({
                type: 'GAME_OVER',
                method: 'dqn',
                metrics: {
                    gamesPlayed: totalDQNGames,
                    totalSteps: totalDQNSteps,
                    epsilon: dqnAgent.epsilon,
                    bestScore: bestDQNScore,
                    averageScore: recentDQNScores.reduce((a, b) => a + b, 0) / Math.max(1, recentDQNScores.length),
                    recentScores: [...recentDQNScores],
                    recentLoss: [...recentDQNLosses]
                }
            });

            // Reset
            grid = createEmptyGrid();
            gameScore = 0;
            gameLines = 0;
            piecesPlaced = 0;
            gameOver = false;
            bag = [];
            nextPieces = [];
            for (let i = 0; i < 5; i++) {
                const res = modernRules.getRandomTetromino(bag);
                nextPieces.push(res.nextPiece);
                bag = res.newBag;
            }

            await sleep(0);
            continue;
        }

        const activeType = nextPieces[0];
        const res = modernRules.getRandomTetromino(bag);
        nextPieces = [...nextPieces.slice(1), res.nextPiece];
        bag = res.newBag;

        const validMoves = getValidMoves(grid, activeType);
        if (validMoves.length === 0) {
            const currentFeatures = [getAggregateHeight(grid), getHolesCount(grid), getBumpiness(grid), 0, getWellsDepth(grid)];
            dqnAgent.remember(normalizeFeatures(currentFeatures), -1.0, [], true);
            gameOver = true;
            piecesPlaced++;
            totalDQNSteps++;
            continue;
        }

        // Choose Move
        let chosenMove: ValidMove;
        if (Math.random() < dqnAgent.epsilon) {
            chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        } else {
            // Exploit with 1-piece lookahead
            const nextType = nextPieces[0];
            let bestUtility = -Infinity;
            let bestMove = validMoves[0];

            if (nextType) {
                // Generate next moves for all P1 placements
                const flatNextChoices: number[][] = [];
                const nextChoicesLengths: number[] = [];

                for (const move1 of validMoves) {
                    if (checkGameOver(move1.resultingGrid)) {
                        nextChoicesLengths.push(0);
                        continue;
                    }
                    const nextMoves2 = getValidMoves(move1.resultingGrid, nextType);
                    const safeNextMoves2 = nextMoves2.filter(m => !checkGameOver(m.resultingGrid));
                    flatNextChoices.push(...safeNextMoves2.map(m => m.features));
                    nextChoicesLengths.push(safeNextMoves2.length);
                }

                let flatQValues: number[] = [];
                if (flatNextChoices.length > 0) {
                    const normalized = flatNextChoices.map(normalizeFeatures);
                    flatQValues = tf.tidy(() => {
                        const tensor = tf.tensor2d(normalized);
                        const prediction = dqnAgent!.model.predict(tensor) as tf.Tensor;
                        return Array.from(prediction.dataSync());
                    });
                }

                let flatIdx = 0;
                for (let i = 0; i < validMoves.length; i++) {
                    const move1 = validMoves[i];
                    const len = nextChoicesLengths[i];
                    const isGameOver1 = checkGameOver(move1.resultingGrid);
                    const r1 = getReward(move1.linesCleared, isGameOver1);

                    let maxNextQ = -Infinity;
                    for (let j = 0; j < len; j++) {
                        const q = flatQValues[flatIdx++];
                        if (q > maxNextQ) maxNextQ = q;
                    }

                    if (len === 0 || isGameOver1) {
                        maxNextQ = -1.0; // Next piece causes game over (scaled penalty)
                    }

                    const utility = r1 + dqnAgent.gamma * maxNextQ;
                    if (utility > bestUtility) {
                        bestUtility = utility;
                        bestMove = move1;
                    }
                }
            } else {
                // Fall back if no next piece
                const normalizedFeaturesBatch = validMoves.map(m => normalizeFeatures(m.features));
                const qValues = tf.tidy(() => {
                    const tensor = tf.tensor2d(normalizedFeaturesBatch);
                    const prediction = dqnAgent!.model.predict(tensor) as tf.Tensor;
                    return Array.from(prediction.dataSync());
                });

                for (let i = 0; i < validMoves.length; i++) {
                    const q = qValues[i];
                    if (q > bestUtility) {
                        bestUtility = q;
                        bestMove = validMoves[i];
                    }
                }
            }

            chosenMove = bestMove;
        }

        // Apply Move
        const nextGrid = chosenMove.resultingGrid;
        const scoreGained = MODERN_GUIDELINE_CONFIG.score.lineClear[Math.min(chosenMove.linesCleared, 4)];
        const reward = getReward(chosenMove.linesCleared, false);

        const nextActiveType = nextPieces[0];
        const nextValidMoves = getValidMoves(nextGrid, nextActiveType);
        const nextStateChoices = nextValidMoves.map(m => normalizeFeatures(m.features));
        const isNextGameOver = nextValidMoves.length === 0;

        // Remember transition
        dqnAgent.remember(
            normalizeFeatures(chosenMove.features),
            isNextGameOver ? -1.0 : reward,
            nextStateChoices,
            isNextGameOver
        );

        grid = nextGrid;
        gameScore += scoreGained;
        gameLines += chosenMove.linesCleared;
        piecesPlaced++;
        totalDQNSteps++;

        // Train network
        const loss = await dqnAgent.train();
        if (loss !== null) {
            recentDQNLosses.push(loss);
            if (recentDQNLosses.length > 100) recentDQNLosses.shift();
        }

        if (isNextGameOver) {
            gameOver = true;
        }

        // Send visual update
        const shouldPost = speed === 'realtime' || (piecesPlaced % 40 === 0);
        if (shouldPost) {
            postMessage({
                type: 'TRAINING_STATUS',
                method: 'dqn',
                metrics: {
                    gamesPlayed: totalDQNGames,
                    totalSteps: totalDQNSteps,
                    epsilon: dqnAgent.epsilon,
                    bestScore: bestDQNScore,
                    averageScore: recentDQNScores.reduce((a, b) => a + b, 0) / Math.max(1, recentDQNScores.length),
                    recentScores: [...recentDQNScores],
                    recentLoss: [...recentDQNLosses],
                    loss: loss ?? (recentDQNLosses[recentDQNLosses.length - 1] ?? 0)
                },
                gameView: {
                    grid: grid.map(row => [...row]),
                    score: gameScore,
                    lines: gameLines,
                    pieceType: activeType,
                    nextPieceType: nextActiveType,
                    piecesPlaced
                }
            });
        }

        // Yield or Delay
        if (speed === 'realtime') {
            await sleep(60);
        } else if (piecesPlaced % 25 === 0) {
            await sleep(0); // Yield to process control inputs
        }
    }
}

async function runGATraining(params: any) {
    const populationSize = params.populationSize ?? 40;
    const elitismCount = params.elitismCount ?? 8;
    const mutationRate = params.mutationRate ?? 0.15;
    const maxPieces = params.maxPiecesPerGame ?? 2000;

    isRunning = true;
    isPaused = false;

    if (currentPopulation.length !== populationSize || params.reset) {
        currentPopulation = [];
        for (let i = 0; i < populationSize; i++) {
            currentPopulation.push(createRandomGenome(`gen-${generation}-ind-${i}`));
        }
        generation = 0;
        currentGenomeIdx = 0;
        recentBestScores = [];
        recentAvgScores = [];
    }

    while (isRunning) {
        if (isPaused) {
            await sleep(100);
            continue;
        }

        const genome = currentPopulation[currentGenomeIdx];
        let grid = createEmptyGrid();
        let gameScore = 0;
        let gameLines = 0;
        let piecesPlaced = 0;
        let gameOver = false;
        let bag: Cell[] = [];

        let nextPieces: Cell[] = [];
        for (let i = 0; i < 5; i++) {
            const res = modernRules.getRandomTetromino(bag);
            nextPieces.push(res.nextPiece);
            bag = res.newBag;
        }

        while (!gameOver && piecesPlaced < maxPieces && isRunning) {
            if (isPaused) {
                await sleep(100);
                continue;
            }

            const activeType = nextPieces[0];
            const res = modernRules.getRandomTetromino(bag);
            nextPieces = [...nextPieces.slice(1), res.nextPiece];
            bag = res.newBag;

            const validMoves = getValidMoves(grid, activeType);
            if (validMoves.length === 0) {
                gameOver = true;
                break;
            }

            // Select best move by genome heuristics with lookahead
            let bestFitness = -Infinity;
            let chosenMove = validMoves[0];
            const nextType = nextPieces[0];

            const maxH = getMaxHeight(grid);
            const isPanic = maxH > 8;

            // Dynamic weights based on panic mode
            const currentWeights = isPanic ? {
                height: -1.20,
                holes: -4.00,
                bumpiness: -0.15,
                lines: 5.00,
                wells: -0.10
            } : {
                height: genome.weights.height,
                holes: genome.weights.holes,
                bumpiness: genome.weights.bumpiness,
                lines: genome.weights.lines,
                wells: genome.weights.wells ?? -0.10
            };

            const lineScores = isPanic ? [0, 40, 100, 300, 1200] : [0, -12, -3, 15, 750];
            const wellsWeight = currentWeights.wells;

            for (const move of validMoves) {
                if (checkGameOver(move.resultingGrid)) {
                    continue; // Skip moves leading to immediate game over
                }
                const scoreGained1 = lineScores[move.linesCleared];
                
                let bestNextFitness = -Infinity;

                if (nextType) {
                    const nextMoves = getValidMoves(move.resultingGrid, nextType);
                    for (const move2 of nextMoves) {
                        if (checkGameOver(move2.resultingGrid)) {
                            continue; // Skip moves leading to game over for next piece
                        }
                        const scoreGained2 = lineScores[move2.linesCleared];
                        
                        const height2 = move2.features[0];
                        const holes2 = move2.features[1];
                        const bumpiness2 = move2.features[2];
                        const wells2 = move2.features[4];

                        const fitness2 =
                            currentWeights.height * height2 +
                            currentWeights.holes * holes2 +
                            currentWeights.bumpiness * bumpiness2 +
                            wellsWeight * wells2 +
                            currentWeights.lines * (scoreGained1 + scoreGained2);

                        if (fitness2 > bestNextFitness) {
                            bestNextFitness = fitness2;
                        }
                    }
                }

                // If next piece was simulated, use that lookahead fitness. 
                // Otherwise (or if next piece results in game over), fall back with a heavy penalty.
                const finalFitness = bestNextFitness !== -Infinity ? bestNextFitness : (
                    currentWeights.height * move.features[0] +
                    currentWeights.holes * move.features[1] +
                    currentWeights.bumpiness * move.features[2] +
                    wellsWeight * move.features[4] +
                    currentWeights.lines * scoreGained1 - 50000 // Apply 50,000 penalty for leaving board in terminal state
                );

                if (finalFitness > bestFitness) {
                    bestFitness = finalFitness;
                    chosenMove = move;
                }
            }

            // Apply Move
            grid = chosenMove.resultingGrid;
            gameScore += MODERN_GUIDELINE_CONFIG.score.lineClear[Math.min(chosenMove.linesCleared, 4)];
            gameLines += chosenMove.linesCleared;
            piecesPlaced++;

            const nextActiveType = nextPieces[0];

            const shouldPost = speed === 'realtime' || (piecesPlaced % 50 === 0);
            if (shouldPost) {
                postMessage({
                    type: 'TRAINING_STATUS',
                    method: 'genetic',
                    metrics: {
                        generation,
                        currentGenomeIndex: currentGenomeIdx,
                        populationSize,
                        bestScore: recentBestScores[recentBestScores.length - 1] ?? 0,
                        averageScore: recentAvgScores[recentAvgScores.length - 1] ?? 0,
                        recentBestScores: [...recentBestScores],
                        recentAverageScores: [...recentAvgScores]
                    },
                    gameView: {
                        grid: grid.map(row => [...row]),
                        score: gameScore,
                        lines: gameLines,
                        pieceType: activeType,
                        nextPieceType: nextActiveType,
                        piecesPlaced
                    }
                });
            }

            if (speed === 'realtime') {
                await sleep(60);
            } else if (piecesPlaced % 30 === 0) {
                await sleep(0);
            }
        }

        if (!isRunning) break;

        genome.fitness = gameScore;
        currentGenomeIdx++;

        // End of Generation
        if (currentGenomeIdx >= populationSize) {
            const bestGenScore = Math.max(...currentPopulation.map(g => g.fitness));
            const avgGenScore = currentPopulation.reduce((sum, g) => sum + g.fitness, 0) / populationSize;

            recentBestScores.push(bestGenScore);
            recentAvgScores.push(avgGenScore);
            if (recentBestScores.length > 50) recentBestScores.shift();
            if (recentAvgScores.length > 50) recentAvgScores.shift();

            // Evolve to next generation
            currentPopulation = evolvePopulation(
                currentPopulation,
                populationSize,
                elitismCount,
                mutationRate
            );

            generation++;
            currentGenomeIdx = 0;

            postMessage({
                type: 'GENERATION_OVER',
                method: 'genetic',
                metrics: {
                    generation,
                    currentGenomeIndex: 0,
                    populationSize,
                    bestScore: bestGenScore,
                    averageScore: avgGenScore,
                    recentBestScores: [...recentBestScores],
                    recentAverageScores: [...recentAvgScores]
                }
            });
        }

        await sleep(0);
    }
}

// -------------------------------------------------------------
// MSG HANDLER
// -------------------------------------------------------------
self.onmessage = async (e: MessageEvent) => {
    const { action, method, params } = e.data;

    switch (action) {
        case 'START_TRAINING':
            if (isRunning) return;
            speed = params.speed ?? 'realtime';
            if (method === 'dqn') {
                runDQNTraining(params);
            } else if (method === 'genetic') {
                runGATraining(params);
            }
            break;

        case 'PAUSE_TRAINING':
            isPaused = true;
            break;

        case 'RESUME_TRAINING':
            isPaused = false;
            break;

        case 'STOP_TRAINING':
            isRunning = false;
            isPaused = false;
            break;

        case 'UPDATE_PARAMS':
            if (params.speed) speed = params.speed;
            if (method === 'dqn' && dqnAgent) {
                if (params.epsilon !== undefined) dqnAgent.epsilon = params.epsilon;
            }
            break;
    }
};
