/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssetPlot } from '../models/AssetPlot';
import type { AssetResponse } from '../models/AssetResponse';
import type { AssetStats } from '../models/AssetStats';
import type { StrategyAddSignalType } from '../models/StrategyAddSignalType';
import type { StrategyCreate } from '../models/StrategyCreate';
import type { StrategyOptimize } from '../models/StrategyOptimize';
import type { StrategyParams } from '../models/StrategyParams';
import type { StrategyPlot } from '../models/StrategyPlot';
import type { StrategyRemoveSignalType } from '../models/StrategyRemoveSignalType';
import type { StrategySignal } from '../models/StrategySignal';
import type { StrategyUpdateParams } from '../models/StrategyUpdateParams';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Read Asset
     * @param assetTicker
     * @returns AssetResponse Successful Response
     * @throws ApiError
     */
    public static readAssetApiAssetsAssetTickerGet(
        assetTicker: string,
    ): CancelablePromise<AssetResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/assets/{asset_ticker}',
            path: {
                'asset_ticker': assetTicker,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Asset Candlestick
     * @param assetTicker
     * @param timeframe
     * @param startDate
     * @param endDate
     * @param volume
     * @param resample
     * @returns AssetPlot Successful Response
     * @throws ApiError
     */
    public static readAssetCandlestickApiAssetsAssetTickerCandlestickGet(
        assetTicker: string,
        timeframe: string = '1d',
        startDate?: string,
        endDate?: string,
        volume: boolean = false,
        resample?: string,
    ): CancelablePromise<AssetPlot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/assets/{asset_ticker}/candlestick',
            path: {
                'asset_ticker': assetTicker,
            },
            query: {
                'timeframe': timeframe,
                'start_date': startDate,
                'end_date': endDate,
                'volume': volume,
                'resample': resample,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Asset Price History
     * @param assetTicker
     * @param timeframe
     * @param startDate
     * @param endDate
     * @param resample
     * @returns AssetPlot Successful Response
     * @throws ApiError
     */
    public static readAssetPriceHistoryApiAssetsAssetTickerPriceHistoryGet(
        assetTicker: string,
        timeframe: string = '1d',
        startDate?: string,
        endDate?: string,
        resample?: string,
    ): CancelablePromise<AssetPlot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/assets/{asset_ticker}/price_history',
            path: {
                'asset_ticker': assetTicker,
            },
            query: {
                'timeframe': timeframe,
                'start_date': startDate,
                'end_date': endDate,
                'resample': resample,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Asset Returns Distribution
     * @param assetTicker
     * @param timeframe
     * @param logRets
     * @param bins
     * @returns AssetPlot Successful Response
     * @throws ApiError
     */
    public static readAssetReturnsDistributionApiAssetsAssetTickerReturnsDistributionGet(
        assetTicker: string,
        timeframe: string = '1d',
        logRets: boolean = false,
        bins: number = 100,
    ): CancelablePromise<AssetPlot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/assets/{asset_ticker}/returns_distribution',
            path: {
                'asset_ticker': assetTicker,
            },
            query: {
                'timeframe': timeframe,
                'log_rets': logRets,
                'bins': bins,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Asset Stats
     * @param assetTicker
     * @returns AssetStats Successful Response
     * @throws ApiError
     */
    public static readAssetStatsApiAssetsAssetTickerStatsGet(
        assetTicker: string,
    ): CancelablePromise<AssetStats> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/assets/{asset_ticker}/stats',
            path: {
                'asset_ticker': assetTicker,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Strategy
     * @param strategyName
     * @param assetTicker
     * @returns StrategyCreate Successful Response
     * @throws ApiError
     */
    public static createStrategyApiStrategiesAssetTickerStrategyNamePost(
        strategyName: string,
        assetTicker: string,
    ): CancelablePromise<StrategyCreate> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/strategies/{asset_ticker}/{strategy_name}',
            path: {
                'strategy_name': strategyName,
                'asset_ticker': assetTicker,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Cache
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getCacheApiStrategiesCacheGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/strategies/cache',
        });
    }
    /**
     * Plot Strategy
     * @param strategyKey
     * @param timeframe
     * @param startDate
     * @param endDate
     * @returns StrategyPlot Successful Response
     * @throws ApiError
     */
    public static plotStrategyApiStrategiesStrategyKeyIndicatorGet(
        strategyKey: string,
        timeframe: string = '1d',
        startDate?: string,
        endDate?: string,
    ): CancelablePromise<StrategyPlot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/strategies/{strategy_key}/indicator',
            path: {
                'strategy_key': strategyKey,
            },
            query: {
                'timeframe': timeframe,
                'start_date': startDate,
                'end_date': endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Strategy Params
     * @param strategyKey
     * @returns StrategyParams Successful Response
     * @throws ApiError
     */
    public static getStrategyParamsApiStrategiesStrategyKeyParamsGet(
        strategyKey: string,
    ): CancelablePromise<StrategyParams> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/strategies/{strategy_key}/params',
            path: {
                'strategy_key': strategyKey,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Strategy Params
     * @param strategyKey
     * @param requestBody
     * @returns StrategyParams Successful Response
     * @throws ApiError
     */
    public static updateStrategyParamsApiStrategiesStrategyKeyParamsPatch(
        strategyKey: string,
        requestBody: StrategyUpdateParams,
    ): CancelablePromise<StrategyParams> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/strategies/{strategy_key}/params',
            path: {
                'strategy_key': strategyKey,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Strategy Signals
     * @param strategyKey
     * @param timeframe
     * @param startDate
     * @param endDate
     * @returns StrategySignal Successful Response
     * @throws ApiError
     */
    public static getStrategySignalsApiStrategiesStrategyKeySignalsGet(
        strategyKey: string,
        timeframe: string = '1d',
        startDate?: string,
        endDate?: string,
    ): CancelablePromise<StrategySignal> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/strategies/{strategy_key}/signals',
            path: {
                'strategy_key': strategyKey,
            },
            query: {
                'timeframe': timeframe,
                'start_date': startDate,
                'end_date': endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Add Signal Type
     * @param strategyKey
     * @param requestBody
     * @returns StrategyParams Successful Response
     * @throws ApiError
     */
    public static addSignalTypeApiStrategiesStrategyKeyAddSignalTypePatch(
        strategyKey: string,
        requestBody: StrategyAddSignalType,
    ): CancelablePromise<StrategyParams> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/strategies/{strategy_key}/add_signal_type',
            path: {
                'strategy_key': strategyKey,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Remove Signal Type
     * @param strategyKey
     * @param requestBody
     * @returns StrategyParams Successful Response
     * @throws ApiError
     */
    public static removeSignalTypeApiStrategiesStrategyKeyRemoveSignalTypePatch(
        strategyKey: string,
        requestBody: StrategyRemoveSignalType,
    ): CancelablePromise<StrategyParams> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/strategies/{strategy_key}/remove_signal_type',
            path: {
                'strategy_key': strategyKey,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Combined Strategy
     * @param strategyKey
     * @returns StrategyCreate Successful Response
     * @throws ApiError
     */
    public static createCombinedStrategyApiStrategiesCombinedCreateStrategyKeyPost(
        strategyKey: string,
    ): CancelablePromise<StrategyCreate> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/strategies/combined/create/{strategy_key}',
            path: {
                'strategy_key': strategyKey,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Add Strategy To Combined
     * @param combinedKey
     * @param strategyKey
     * @param weight
     * @returns StrategyParams Successful Response
     * @throws ApiError
     */
    public static addStrategyToCombinedApiStrategiesCombinedCombinedKeyStrategyKeyAddStrategyPatch(
        combinedKey: string,
        strategyKey: string,
        weight: number = 1,
    ): CancelablePromise<StrategyParams> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/strategies/combined/{combined_key}/{strategy_key}/add_strategy',
            path: {
                'combined_key': combinedKey,
                'strategy_key': strategyKey,
            },
            query: {
                'weight': weight,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Remove Strategy From Combined
     * @param combinedKey
     * @param strategyKey
     * @returns StrategyParams Successful Response
     * @throws ApiError
     */
    public static removeStrategyFromCombinedApiStrategiesCombinedCombinedKeyStrategyKeyRemoveStrategyPatch(
        combinedKey: string,
        strategyKey: string,
    ): CancelablePromise<StrategyParams> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/strategies/combined/{combined_key}/{strategy_key}/remove_strategy',
            path: {
                'combined_key': combinedKey,
                'strategy_key': strategyKey,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Backtest
     * @param strategyKey
     * @param timeframe
     * @param startDate
     * @param endDate
     * @returns StrategyPlot Successful Response
     * @throws ApiError
     */
    public static backtestApiStrategiesStrategyKeyBacktestGet(
        strategyKey: string,
        timeframe: string = '1d',
        startDate?: string,
        endDate?: string,
    ): CancelablePromise<StrategyPlot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/strategies/{strategy_key}/backtest',
            path: {
                'strategy_key': strategyKey,
            },
            query: {
                'timeframe': timeframe,
                'start_date': startDate,
                'end_date': endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Optimize Parameters
     * @param strategyKey
     * @param timeframe
     * @param startDate
     * @param endDate
     * @returns StrategyOptimize Successful Response
     * @throws ApiError
     */
    public static optimizeParametersApiStrategiesStrategyKeyOptimizeParamsGet(
        strategyKey: string,
        timeframe: string = '1d',
        startDate?: string,
        endDate?: string,
    ): CancelablePromise<StrategyOptimize> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/strategies/{strategy_key}/optimize/params',
            path: {
                'strategy_key': strategyKey,
            },
            query: {
                'timeframe': timeframe,
                'start_date': startDate,
                'end_date': endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Optimize Weights
     * @param strategyKey
     * @param timeframe
     * @param startDate
     * @param endDate
     * @param runs
     * @returns StrategyOptimize Successful Response
     * @throws ApiError
     */
    public static optimizeWeightsApiStrategiesStrategyKeyOptimizeWeightsGet(
        strategyKey: string,
        timeframe: string = '1d',
        startDate?: string,
        endDate?: string,
        runs: number = 20,
    ): CancelablePromise<StrategyOptimize> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/strategies/{strategy_key}/optimize/weights',
            path: {
                'strategy_key': strategyKey,
            },
            query: {
                'timeframe': timeframe,
                'start_date': startDate,
                'end_date': endDate,
                'runs': runs,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Root
     * @returns any Successful Response
     * @throws ApiError
     */
    public static readRootGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
        });
    }
}
