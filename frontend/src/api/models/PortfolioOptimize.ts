/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PortfolioEfficientFrontier } from './PortfolioEfficientFrontier';
export type PortfolioOptimize = {
    /**
     * The expected returns of the optimal portfolio
     */
    opt_returns: number;
    /**
     * The expected volatility of the optimal portfolio
     */
    opt_volatility: number;
    /**
     * The expected Sharpe ratio of the optimal portfolio
     */
    opt_sharpe_ratio: number;
    /**
     * The optimal weights for each asset in the portfolio
     */
    opt_weights: Record<string, number>;
    /**
     * The efficient frontier results of the portfolio
     */
    ef_results: PortfolioEfficientFrontier;
};

