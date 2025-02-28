/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlotJSON } from './PlotJSON';
export type RiskPlots = {
    /**
     * The pie chart representing the risk decomposition for each asset in the portfolio
     */
    risk_decomposition?: (PlotJSON | null);
    /**
     * The line chart representing the drawdowns
     */
    drawdown_plot?: (PlotJSON | null);
    /**
     * The histogram representing the drawdown frequency
     */
    drawdown_frequency?: (PlotJSON | null);
};

