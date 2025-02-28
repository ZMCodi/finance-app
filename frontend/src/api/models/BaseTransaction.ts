/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TransactionType } from './TransactionType';
export type BaseTransaction = {
    /**
     * The type of transaction
     */
    type: TransactionType;
    /**
     * The asset ticker according to Yahoo Finance or Cash
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
    /**
     * The unique identifier for the transaction
     */
    id: number;
};

