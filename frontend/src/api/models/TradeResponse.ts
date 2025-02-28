/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TradeResponse = {
    /**
     * The asset ticker according to Yahoo Finance
     */
    asset_ticker: string;
    /**
     * The number of shares traded
     */
    shares: number;
    /**
     * The value of the trade
     */
    value: number;
    /**
     * The date of the trade
     */
    date: string;
    /**
     * The remaining cash in the portfolio
     */
    current_cash: number;
};

