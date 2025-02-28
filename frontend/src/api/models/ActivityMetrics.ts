/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ActivityMetrics = {
    /**
     * The realized profit and loss of the portfolio from trades
     */
    realized_pnl: number;
    /**
     * The unrealized profit and loss of the portfolio from holdings
     */
    unrealized_pnl: number;
    /**
     * The total profit and loss of the portfolio from trades and holdings
     */
    total_pnl: number;
    /**
     * The difference between current value and initial investment
     */
    investment_pnl: number;
    /**
     * The net deposits into the portfolio
     */
    net_deposits: number;
    /**
     * The number of buys and sells
     */
    number_of_trades: number;
    /**
     * The percentage of winning trades
     */
    win_rate: number;
    /**
     * The ratio of gross profit to gross loss
     */
    profit_factor: number;
    /**
     * The ratio of average win to average loss
     */
    average_win_loss_ratio: number;
};

