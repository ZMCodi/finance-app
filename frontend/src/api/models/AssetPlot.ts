/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlotJSON } from './PlotJSON';
import type { PlotType } from './PlotType';
export type AssetPlot = {
    /**
     * The asset ticker according to Yahoo Finance
     */
    ticker: string;
    /**
     * The type of plot
     */
    plot_type: PlotType;
    /**
     * The JSON representation of the plot
     */
    json_data: PlotJSON;
};

