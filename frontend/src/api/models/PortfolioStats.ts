/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActivityMetrics } from './ActivityMetrics';
import type { DrawdownMetrics } from './DrawdownMetrics';
import type { PerformanceMetrics } from './PerformanceMetrics';
import type { PositionMetrics } from './PositionMetrics';
import type { RiskMetrics } from './RiskMetrics';
export type PortfolioStats = {
    /**
     * The performance metrics of the portfolio
     */
    performance: PerformanceMetrics;
    /**
     * The risk metrics of the portfolio
     */
    risk: RiskMetrics;
    /**
     * The drawdown metrics of the portfolio
     */
    drawdown: DrawdownMetrics;
    /**
     * The position metrics of the portfolio
     */
    position: PositionMetrics;
    /**
     * The activity metrics of the portfolio
     */
    activity: ActivityMetrics;
};

