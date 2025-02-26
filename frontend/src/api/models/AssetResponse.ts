/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssetType } from './AssetType';
export type AssetResponse = {
    /**
     * The asset ticker according to Yahoo Finance
     */
    ticker: string;
    /**
     * The type of asset
     */
    asset_type: AssetType;
    /**
     * The currency the asset is traded in
     */
    currency: string;
    /**
     * The sector the asset belongs to
     */
    sector: (string | null);
};

