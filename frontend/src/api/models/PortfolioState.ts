/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PortfolioState = {
    /**
     * The number of shares for each asset in the portfolio
     */
    holdings: Record<string, number>;
    /**
     * The average buying price for each asset in the portfolio
     */
    cost_bases: Record<string, number>;
    /**
     * The list of assets in the portfolio
     */
    assets: Array<string>;
    /**
     * The current cash in the portfolio
     */
    cash: number;
    /**
     * The risk-free rate for the portfolio
     */
    'r': number;
    /**
     * The currency of the portfolio
     */
    currency: string;
    /**
     * The last transaction id for the portfolio
     */
    id: number;
};

