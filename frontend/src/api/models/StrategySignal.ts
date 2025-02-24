/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StrategyType } from './StrategyType';
export type StrategySignal = {
    /**
     * The asset ticker according to Yahoo Finance
     */
    ticker: string;
    /**
     * The strategy name
     */
    strategy: StrategyType;
    /**
     * The signals of the strategy
     */
    signals: Record<string, number>;
};

