/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlotJSON } from './PlotJSON';
export type ReturnsPlots = {
    /**
     * The line chart representing the daily returns
     */
    returns_chart?: (PlotJSON | null);
    /**
     * The histogram representing the returns distribution
     */
    returns_dist?: (PlotJSON | null);
    /**
     * The line chart representing the profit and loss
     */
    pnl_chart?: (PlotJSON | null);
};

