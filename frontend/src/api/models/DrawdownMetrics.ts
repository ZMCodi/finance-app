/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DrawdownMetrics = {
    /**
     * The maximum drawdown value of the portfolio
     */
    max_drawdown: number;
    /**
     * The start, end date and duration of the longest drawdown
     */
    longest_drawdown_duration: Record<string, (string | number)>;
    /**
     * The average drawdown value of the portfolio
     */
    average_drawdown: number;
    /**
     * The average duration of a drawdown
     */
    average_drawdown_duration: number;
    /**
     * The average time to recover from a drawdown
     */
    time_to_recovery: number;
    /**
     * The drawdown ratio of the portfolio
     */
    drawdown_ratio: number;
    /**
     * The Calmar ratio of the portfolio
     */
    calmar_ratio: number;
};

