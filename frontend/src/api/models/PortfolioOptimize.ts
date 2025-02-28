/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PortfolioOptimize = {
    /**
     * The expected returns of the optimal portfolio
     */
    returns: number;
    /**
     * The expected volatility of the optimal portfolio
     */
    volatility: number;
    /**
     * The expected Sharpe ratio of the optimal portfolio
     */
    sharpe_ratio: number;
    /**
     * The optimal weights for each asset in the portfolio
     */
    weights: Record<string, number>;
};

