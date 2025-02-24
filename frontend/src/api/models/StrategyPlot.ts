/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StrategyType } from './StrategyType';
export type StrategyPlot = {
    /**
     * The asset ticker according to Yahoo Finance
     */
    ticker: string;
    /**
     * The strategy name
     */
    strategy: StrategyType;
    /**
     * The JSON representation of the plot
     */
    json_data: Record<string, any>;
};

