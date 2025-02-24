/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OptimizeParamsResults } from './OptimizeParamsResults';
import type { OptimizeWeightResults } from './OptimizeWeightResults';
import type { StrategyType } from './StrategyType';
export type StrategyOptimize = {
    /**
     * The asset ticker according to Yahoo Finance
     */
    ticker: string;
    /**
     * The strategy name
     */
    strategy: StrategyType;
    /**
     * The results of the optimization
     */
    results: (OptimizeParamsResults | OptimizeWeightResults);
};

