/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StrategyType } from './StrategyType';
export type StrategyCreate = {
    /**
     * The asset ticker according to Yahoo Finance
     */
    ticker: string;
    /**
     * The strategy name
     */
    strategy: StrategyType;
    /**
     * The unique identifier for the strategy
     */
    strategy_id: string;
};

