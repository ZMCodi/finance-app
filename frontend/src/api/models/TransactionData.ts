/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TransactionType } from './TransactionType';
export type TransactionData = {
    /**
     * The type of transaction
     */
    type: TransactionType;
    /**
     * The asset ticker or cash
     */
    asset: string;
    /**
     * The number of shares traded
     */
    shares: number;
    /**
     * The value of the trade
     */
    value: number;
    /**
     * The profit of the trade
     */
    profit: number;
    /**
     * The date of the trade
     */
    date: string;
};

