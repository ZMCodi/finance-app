/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DailyReturnsMetrics } from './DailyReturnsMetrics';
export type PerformanceMetrics = {
    /**
     * The total returns of the portfolio
     */
    total_returns: number;
    /**
     * The returns from trading
     */
    trading_returns: number;
    /**
     * The annualized returns of the portfolio
     */
    annualized_returns: number;
    /**
     * The daily returns statistics
     */
    daily_returns: DailyReturnsMetrics;
    /**
     * The returns of the best day
     */
    best_day: number;
    /**
     * The returns of the worst day
     */
    worst_day: number;
    /**
     * Ratio of days with positive returns
     */
    positive_days: number;
};

