import { Genome } from '../../types/tetrisAI';

export function createRandomGenome(id: string): Genome {
    return {
        id,
        weights: {
            height: Math.random() * 2 - 1,    // Random weight between -1 and 1
            holes: Math.random() * 2 - 1,     // Random weight between -1 and 1
            bumpiness: Math.random() * 2 - 1, // Random weight between -1 and 1
            lines: Math.random() * 2 - 1,     // Random weight between -1 and 1
            wells: Math.random() * 2 - 1,     // Random weight between -1 and 1
        },
        fitness: 0
    };
}

/**
 * Combines two parent genomes to produce a child genome using uniform blend.
 */
export function crossover(p1: Genome, p2: Genome, childId: string): Genome {
    const blend = () => Math.random() < 0.5 ? 0 : 1;
    
    return {
        id: childId,
        weights: {
            height: blend() === 0 ? p1.weights.height : p2.weights.height,
            holes: blend() === 0 ? p1.weights.holes : p2.weights.holes,
            bumpiness: blend() === 0 ? p1.weights.bumpiness : p2.weights.bumpiness,
            lines: blend() === 0 ? p1.weights.lines : p2.weights.lines,
            wells: blend() === 0 ? p1.weights.wells : p2.weights.wells,
        },
        fitness: 0
    };
}

/**
 * Randomly mutates the weights of a genome based on mutation rate and strength.
 */
export function mutate(genome: Genome, mutationRate: number = 0.1, mutationStep: number = 0.2): Genome {
    const weights = { ...genome.weights };

    if (Math.random() < mutationRate) weights.height += (Math.random() * 2 - 1) * mutationStep;
    if (Math.random() < mutationRate) weights.holes += (Math.random() * 2 - 1) * mutationStep;
    if (Math.random() < mutationRate) weights.bumpiness += (Math.random() * 2 - 1) * mutationStep;
    if (Math.random() < mutationRate) weights.lines += (Math.random() * 2 - 1) * mutationStep;
    if (Math.random() < mutationRate) weights.wells += (Math.random() * 2 - 1) * mutationStep;

    return {
        ...genome,
        weights
    };
}

/**
 * Creates the next generation of a population using Elitism selection, crossover, and mutation.
 */
export function evolvePopulation(
    currentPopulation: Genome[],
    populationSize: number = 50,
    elitismCount: number = 10,
    mutationRate: number = 0.15
): Genome[] {
    // Sort descending by fitness (score)
    const sorted = [...currentPopulation].sort((a, b) => b.fitness - a.fitness);
    
    const nextGeneration: Genome[] = [];

    // 1. Elitism: Keep the best performers unchanged
    for (let i = 0; i < elitismCount; i++) {
        nextGeneration.push({
            ...sorted[i],
            id: `gen-${nextGeneration.length}`
        });
    }

    // 2. Select, breed, and mutate to fill remaining population
    while (nextGeneration.length < populationSize) {
        // Tournament Selection among top half
        const selectParent = () => {
            const index1 = Math.floor(Math.random() * (populationSize / 2));
            const index2 = Math.floor(Math.random() * (populationSize / 2));
            return sorted[index1].fitness > sorted[index2].fitness ? sorted[index1] : sorted[index2];
        };

        const parent1 = selectParent();
        const parent2 = selectParent();

        let child = crossover(parent1, parent2, `gen-${nextGeneration.length}`);
        child = mutate(child, mutationRate);

        nextGeneration.push(child);
    }

    return nextGeneration;
}
