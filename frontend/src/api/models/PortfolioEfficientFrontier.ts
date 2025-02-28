/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlotJSON } from './PlotJSON';
export type PortfolioEfficientFrontier = {
    /**
     * The efficient frontier plot of the portfolio
     */
    efficient_frontier: PlotJSON;
    /**
     * The (sorted) expected returns of the portfolios on the efficient frontier
     */
    returns: Array<number>;
    /**
     * The expected volatilities of the portfolios on the efficient frontier
     */
    volatilities: Array<number>;
    /**
     * The expected Sharpe ratios of the portfolios on the efficient frontier
     */
    sharpe_ratios: Array<number>;
    /**
     * The optimal weights for each asset in the portfolios on the efficient frontier
     */
    weights: Array<Record<string, number>>;
};

