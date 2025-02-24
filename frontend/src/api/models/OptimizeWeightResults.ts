/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OptimizeResults } from './OptimizeResults';
export type OptimizeWeightResults = {
    /**
     * The optimized weights
     */
    weights: Array<number>;
    /**
     * The voting threshold for the optimized weights
     */
    vote_threshold: number;
    /**
     * The results of the optimization
     */
    results: OptimizeResults;
};

