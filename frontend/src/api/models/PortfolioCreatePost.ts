/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PortfolioInitialHoldings } from './PortfolioInitialHoldings';
export type PortfolioCreatePost = {
    /**
     * The initial holdings of the portfolio
     */
    assets?: Array<PortfolioInitialHoldings>;
    /**
     * The initial cash in the portfolio
     */
    cash?: number;
    /**
     * The currency of the portfolio
     */
    currency?: (string | null);
    /**
     * The risk-free rate for the portfolio
     */
    'r'?: number;
    /**
     * The name of the portfolio
     */
    name?: (string | null);
};

