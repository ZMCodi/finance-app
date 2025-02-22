from fastapi import APIRouter, Depends
from app.core.asset import Asset
from app.models.asset import AssetResponse, AssetPlot
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
def read_asset_candlestick(asset: Asset = Depends(get_asset)):
    fig = asset.plot_candlestick()
    return {
        'ticker': asset.ticker,
        'plot_type': 'candlestick',
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get("/{asset_ticker}/price_history", response_model=AssetPlot)
def read_asset_price_history(asset: Asset = Depends(get_asset)):
    fig = asset.plot_price_history()
    return {
        'ticker': asset.ticker,
        'plot_type': 'price history',
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get("/{asset_ticker}/returns_distribution", response_model=AssetPlot)
def read_asset_returns_distribution(asset: Asset = Depends(get_asset)):
    fig = asset.plot_returns_dist()
    return {
        'ticker': asset.ticker,
        'plot_type': 'returns distribution',
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get("/{asset_ticker}/SMA", response_model=AssetPlot)
def read_asset_SMA(asset: Asset = Depends(get_asset)):
    fig = asset.plot_SMA()
    return {
        'ticker': asset.ticker,
        'plot_type': 'SMA',
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }
