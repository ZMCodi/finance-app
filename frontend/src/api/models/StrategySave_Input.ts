/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StrategyIndicators_Input } from './StrategyIndicators_Input';
import type { StrategyUpdateParams } from './StrategyUpdateParams';
export type StrategySave_Input = {
    /**
     * The parameters of the combined strategy
     */
    params: StrategyUpdateParams;
    /**
     * The parameters of the indicators
     */
    indicators: Array<StrategyIndicators_Input>;
};

