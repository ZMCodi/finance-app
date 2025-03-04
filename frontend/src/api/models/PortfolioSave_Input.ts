/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseTransaction } from './BaseTransaction';
import type { PortfolioState } from './PortfolioState';
export type PortfolioSave_Input = {
    /**
     * The current state of the portfolio
     */
    state: PortfolioState;
    /**
     * The transaction data for each transaction in the portfolio
     */
    transactions: Array<BaseTransaction>;
};

