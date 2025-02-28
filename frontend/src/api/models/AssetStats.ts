/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DistributionStats } from './DistributionStats';
import type { PriceStats } from './PriceStats';
import type { ReturnsStats } from './ReturnsStats';
export type AssetStats = {
    /**
     * The returns statistics of the asset
     */
    returns: ReturnsStats;
    /**
     * The price statistics of the asset
     */
    price: PriceStats;
    /**
     * The returns distribution statistics of the asset
     */
    distribution: DistributionStats;
    /**
     * The currency the asset is traded in
     */
    currency: string;
};

