/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RiskMetrics = {
    /**
     * The volatility of the portfolio
     */
    volatility: number;
    /**
     * The Sharpe ratio of the portfolio
     */
    sharpe_ratio: number;
    /**
     * The Sortino ratio of the portfolio
     */
    sortino_ratio: number;
    /**
     * The beta of the portfolio
     */
    beta: number;
    /**
     * The VAR of the portfolio at 95% confidence
     */
    value_at_risk: number;
    /**
     * The tracking error of the portfolio compared to SPY
     */
    tracking_error: number;
    /**
     * The information ratio of the portfolio compared to SPY
     */
    information_ratio: number;
    /**
     * The Treynor ratio of the portfolio
     */
    treynor_ratio: number;
};

