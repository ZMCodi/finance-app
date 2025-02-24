/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CombineType } from './CombineType';
import type { MA_ParamType } from './MA_ParamType';
import type { RSI_Exit } from './RSI_Exit';
export type StrategyUpdateParams = {
    /**
     * The short moving average period
     */
    short?: (number | null);
    /**
     * The long moving average period
     */
    long?: (number | null);
    /**
     * The type of parameter to update
     */
    param_type?: (MA_ParamType | null);
    /**
     * Whether to use exponential weighted moving average
     */
    ewm?: (boolean | null);
    /**
     * The upper bound for the RSI
     */
    ub?: (number | null);
    /**
     * The lower bound for the RSI
     */
    lb?: (number | null);
    /**
     * The window period for the RSI or MA window for BB
     */
    window?: (number | null);
    /**
     * The type of exit signal
     */
    exit?: (RSI_Exit | null);
    /**
     * Whether to use mean reversion
     */
    m_rev?: (boolean | null);
    /**
     * The mean reversion bound
     */
    m_rev_bound?: (number | null);
    /**
     * The fast moving average period
     */
    fast?: (number | null);
    /**
     * The slow moving average period
     */
    slow?: (number | null);
    /**
     * The signal line period
     */
    signal?: (number | null);
    /**
     * The number of standard deviations for the Bollinger Bands
     */
    num_std?: (number | null);
    /**
     * The type of signal combination
     */
    combine?: (CombineType | null);
    /**
     * The weights for the signals
     */
    weights?: (Array<number> | null);
    /**
     * The threshold for the vote
     */
    vote_threshold?: (number | null);
};

