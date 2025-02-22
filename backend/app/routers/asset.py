from fastapi import APIRouter, Depends
from app.core.asset import Asset
from app.models.asset import AssetResponse, AssetPlot, AssetStats
from functools import lru_cache
import json
from plotly.utils import PlotlyJSONEncoder

router = APIRouter(prefix='/api/assets')

@lru_cache(maxsize=30)
def get_asset(asset_ticker: str):
    return Asset(asset_ticker)

@router.get("/{asset_ticker}", response_model=AssetResponse)
def read_asset(asset: Asset = Depends(get_asset)):
    return {
        'ticker': asset.ticker,
        'asset_type': asset.asset_type,
        'currency': asset.currency,
        'sector': asset.sector,
    }

@router.get("/{asset_ticker}/candlestick", response_model=AssetPlot)
def read_asset_candlestick(asset: Asset = Depends(get_asset), timeframe: str = '1d', start_date: str = None, end_date: str = None, volume: bool = False, resample: str = None):
    fig = asset.plot_candlestick(timeframe=timeframe, start_date=start_date, end_date=end_date, volume=volume, resample=resample)
    return {
        'ticker': asset.ticker,
        'plot_type': 'candlestick',
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get("/{asset_ticker}/price_history", response_model=AssetPlot)
def read_asset_price_history(asset: Asset = Depends(get_asset), timeframe: str = '1d', start_date: str = None, end_date: str = None, resample: str = None):
    fig = asset.plot_price_history(timeframe=timeframe, start_date=start_date, end_date=end_date, resample=resample)
    return {
        'ticker': asset.ticker,
        'plot_type': 'price history',
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get("/{asset_ticker}/returns_distribution", response_model=AssetPlot)
def read_asset_returns_distribution(asset: Asset = Depends(get_asset), log_rets: bool = False, bins: int = 100):
    fig = asset.plot_returns_dist(log_rets=log_rets, bins=bins)
    return {
        'ticker': asset.ticker,
        'plot_type': 'returns distribution',
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get("/{asset_ticker}/stats", response_model=AssetStats)
def read_asset_stats(asset: Asset = Depends(get_asset)):
    return {
        'stats': asset.stats,
    }
