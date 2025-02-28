/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PortfolioCreate = {
    /**
     * The unique identifier for the portfolio
     */
    portfolio_id: string;
    /**
     * The currency of the portfolio
     */
    currency: string;
    /**
     * The current cash in the portfolio
     */
    cash: number;
    /**
     * The current holdings in the portfolio
     */
    holdings: Record<string, number>;
};

