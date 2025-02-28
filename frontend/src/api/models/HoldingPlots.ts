/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlotJSON } from './PlotJSON';
export type HoldingPlots = {
    /**
     * The pie chart representing the weights of each asset
     */
    holdings_chart: PlotJSON;
    /**
     * The pie chart representing the exposure to each asset type
     */
    asset_type_exposure: PlotJSON;
    /**
     * The pie chart representing the exposure to each sector
     */
    sector_exposure: PlotJSON;
    /**
     * The correlation matrix of the assets
     */
    correlation_matrix: PlotJSON;
};

