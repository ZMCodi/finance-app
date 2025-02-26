/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlotJSON } from './PlotJSON';
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
     * The results of the backtest
     */
    results?: (Record<string, number> | null);
    /**
     * The JSON representation of the plot
     */
    json_data: Array<PlotJSON>;
};

