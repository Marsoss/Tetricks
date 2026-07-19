# Tetris AI System Documentation

This document explains the architecture, algorithms, and implementation details of the Tetris AI training system.

---

## 1. System Overview

The system consists of two primary parts:
1. **Headless Web Worker (`src/workers/tetrisTraining.worker.ts`)**: Runs game simulations at maximum speed. It hosts a **Deep Q-Learning (DQN)** neural network agent and a **Genetic Algorithm (GA)** population evolver.
2. **React Dashboard (`src/components/AIDashboard.tsx`)**: Provides an interactive dashboard with **Recharts** visualizations, hyperparameter configuration forms, training control buttons (Start, Pause, Stop), and a real-time game board preview of the AI playing.

```mermaid
graph TD
    A[AIDashboard.tsx] -->|postMessage: START_TRAINING / UPDATE_PARAMS| B(tetrisTraining.worker.ts)
    B -->|postMessage: TRAINING_STATUS / GAME_OVER| A
    subgraph Web Worker (Background Thread)
        B --> C{Training Method}
        C -->|DQN| D[Deep Q-Learning Agent]
        C -->|Genetic| E[Genetic Algorithm Population]
        D --> F[TensorFlow.js Model]
        E --> G[geneticTrainer.ts Heuristics]
    end
    subgraph UI Thread (Main)
        A --> H[Recharts Graphs]
        A --> I[Live Board Preview]
        A --> J[Hyperparameter Inputs]
    end
```

---

## 2. AI Abstractions & State Features

To simplify the state space and accelerate training, both the DQN and Genetic Algorithm use a **Heuristic State Representation** rather than raw grid pixels. Instead of feeding the full $10 \times 20$ grid directly to the model, we extract **4 key features** representing the state of the grid *after* a move is simulated:

1. **Aggregate Height**: The sum of the heights of all columns.
2. **Holes Count**: The number of empty cells that have at least one occupied block above them in the same column.
3. **Bumpiness**: The sum of absolute height differences between all adjacent columns.
4. **Lines Cleared**: The number of complete rows cleared by placing the piece.

These features are calculated using helper functions in `src/utils/ai/gridAnalyzer.ts`.

---

## 3. Deep Q-Learning (DQN)

The DQN agent estimates the value (Q-value) of the candidate grid states resulting from all possible placements of the current piece.

### Heuristic Action Selection
For the active piece, the agent simulates all possible orientations (0 to 3 clockwise rotations) and horizontal positions (column offsets from -3 to 9). For each valid placement:
1. It simulates dropping the piece to the bottom.
2. It calculates the resulting grid features: `[Height, Holes, Bumpiness, Lines]`.
3. It passes the normalized features to the Q-Network to predict the expected future score ($Q$-value).
4. The agent selects the move leading to the state with the highest $Q$-value (or a random move during exploration).

### Neural Network Architecture
The network is built using `@tensorflow/tfjs` in the Web Worker:
* **Input Layer**: 4 nodes (normalized features: `[height / 200, holes / 20, bumpiness / 20, lines / 4]`).
* **Hidden Layer 1**: Dense layer with 64 units and ReLU activation.
* **Hidden Layer 2**: Dense layer with 32 units and ReLU activation.
* **Output Layer**: Dense layer with 1 unit (linear activation, representing the predicted Q-value).

### Reward Function
The reward function encourages survival and line clears while penalizing game over states:
* **Normal Placement**: $\text{Reward} = \text{lines\_cleared\_points} + 1$ (where lines cleared points are $0$ for 0 lines, $10$ for 1 line, $30$ for 2 lines, $90$ for 3 lines, and $300$ for 4 lines).
* **Game Over**: $\text{Reward} = -100$

### Replay Memory & Training
Transitions are stored in a circular Replay Buffer of size $10,000$:
$$\text{Transition} = \Big( \text{state}, \text{reward}, \text{next\_state\_choices}, \text{done} \Big)$$
* `state`: The normalized features of the chosen resulting grid.
* `next_state_choices`: The features of all possible placements for the next piece spawning on that grid.

During training, a minibatch of size $64$ is randomly sampled. The target Q-value $Y$ is calculated using the Bellman Equation:
$$Y = \begin{cases} R, & \text{if done is true} \\ R + \gamma \max_{s''} Q_{\text{target}}(s''), & \text{if done is false} \end{cases}$$
Where $\gamma = 0.90$ is the discount factor and $Q_{\text{target}}$ is predicted by a Target Network. The Target Network is synchronized with the active network every $1000$ training steps to stabilize training.

### Performance Optimization
To avoid latency overhead when evaluating moves, predictions are batched:
1. All candidate moves for the current piece are packed into a single tensor of shape `[num_moves, 4]` and predicted in a single network pass.
2. During Bellman updates, all next-state choices for the entire batch are flattened and predicted in one single call to `targetModel.predict(tensor)`. This batching yields a $10\times$ speedup, allowing headless training to run at hundreds of steps per second on CPU.

---

## 4. Genetic Algorithm (GA)

The Genetic Algorithm evolves a population of heuristic weights, bypassing the need for neural network backpropagation.

### Weights Representation
Each individual (genome) in the population is defined by 4 weights corresponding to our state features:
$$\text{Fitness Score} = (w_{\text{height}} \times \text{Height}) + (w_{\text{holes}} \times \text{Holes}) + (w_{\text{bumpiness}} \times \text{Bumpiness}) + (w_{\text{lines}} \times \text{Score Gained})$$

### Evolution Cycle
1. **Population Size**: Default is 40 genomes.
2. **Evaluation**: Each genome plays a headless game of Tetris (capped at 1,000 or 2,000 pieces to prevent infinite loops for high-performing weights). The final game score is recorded as the genome's fitness.
3. **Elitism**: The top 8 performers are copied unchanged to the next generation.
4. **Tournament Selection**: To select parents for breeding, two random genomes from the top 50% of the population compete, and the one with higher fitness is chosen.
5. **Uniform Crossover**: Two parents combine weights. For each weight, there is a 50% chance to copy from parent A or parent B.
6. **Mutation**: A mutation step (default 15% rate) adds a small random value (with range $\pm 0.2$) to the child's weights.

---

## 5. Communication Protocol (`postMessage`)

Because the Web Worker runs on a separate thread, communication is asynchronous:

### Commands (Main Thread $\rightarrow$ Web Worker)
* `START_TRAINING`: Begins simulation loop.
  * Arguments: `method` ('dqn' | 'genetic'), `params` (learning rates, population size, mutation rates, speed mode, etc.).
* `PAUSE_TRAINING`: Flags the worker to sleep.
* `RESUME_TRAINING`: Clears pause flag.
* `STOP_TRAINING`: Terminates current loops and cleans up variables.
* `UPDATE_PARAMS`: Alters variables (like toggle speed or epsilon) on the fly without stopping simulation.

### Data Updates (Web Worker $\rightarrow$ Main Thread)
* `TRAINING_STATUS`: Periodic updates (sent every move in `realtime` speed, or every 40-50 moves in `max` speed).
  * `metrics`: Current statistics (Epsilon, loss, games played, best score, average score).
  * `gameView`: Current 2D grid matrix, score, lines, active and next piece type.
* `GAME_OVER`: Dispatched when a game ends to update DQN score history charts.
* `GENERATION_OVER`: Dispatched when a genetic generation completes to update GA charts.
