import * as fs from 'fs';
import * as path from 'path';
import { createRandomGenome, evolvePopulation } from '../utils/ai/geneticTrainer';
import { simulateGame } from '../utils/ai/aiSimulator';
import { HeuristicsAI } from '../utils/ai/heuristicsAI';
import { modernRules } from '../utils/rules/modernRules';
import { Genome } from '../types/tetrisAI';

function runTraining() {
    const populationSize = 20;
    const generations = 10;
    const maxPiecesPerSimulation = 400; // Limit length to keep evaluations super fast
    
    console.log(`=== STARTING GENETIC ALGORITHM TRAINING ===`);
    console.log(`Population size: ${populationSize} genomes`);
    console.log(`Generations: ${generations}`);
    console.log(`Max moves per game: ${maxPiecesPerSimulation}\n`);

    // 1. Initialize random population
    let population: Genome[] = Array.from({ length: populationSize }, (_, idx) => 
        createRandomGenome(`gen0-${idx}`)
    );

    let bestGenomeOverall: Genome | null = null;

    for (let gen = 1; gen <= generations; gen++) {
        console.log(`--- Generation ${gen} / ${generations} ---`);
        
        // Evaluate fitness for each genome in population
        for (let i = 0; i < population.length; i++) {
            const genome = population[i];
            const testAI = new HeuristicsAI(`TestGenome-${genome.id}`, genome.weights);
            
            // Run 3 evaluation games to average out random noise (e.g. piece sequences)
            let totalFitness = 0;
            const evalGames = 2;
            for (let g = 0; g < evalGames; g++) {
                totalFitness += simulateGame(testAI, modernRules, maxPiecesPerSimulation);
            }
            
            genome.fitness = Math.round(totalFitness / evalGames);
        }

        // Sort descending by fitness
        const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
        const bestOfGen = sorted[0];

        if (!bestGenomeOverall || bestOfGen.fitness > bestGenomeOverall.fitness) {
            bestGenomeOverall = { ...bestOfGen };
        }

        console.log(`Best Fitness of Gen ${gen}: ${bestOfGen.fitness} points`);
        console.log(`Weights: Ht: ${bestOfGen.weights.height.toFixed(4)} | Hl: ${bestOfGen.weights.holes.toFixed(4)} | Bmp: ${bestOfGen.weights.bumpiness.toFixed(4)} | Lns: ${bestOfGen.weights.lines.toFixed(4)}\n`);

        // Evolve to create next generation
        population = evolvePopulation(population, populationSize, 4, 0.2);
    }

    if (bestGenomeOverall) {
        console.log(`=== TRAINING COMPLETED ===`);
        console.log(`Champion Genome Fitness: ${bestGenomeOverall.fitness}`);
        console.log(`Saving champion weights...`);

        // Save weights to src/constants/best_weights.json
        const targetPath = path.resolve('src/constants/best_weights.json');
        
        // Ensure directory exists
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(targetPath, JSON.stringify(bestGenomeOverall.weights, null, 4));
        console.log(`Weights saved successfully to ${targetPath}`);
    }
}

// Run evolution training loop
runTraining();
