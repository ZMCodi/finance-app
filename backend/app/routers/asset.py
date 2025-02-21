from fastapi import APIRouter
from app.core.asset import Asset
from app.models.asset import AssetType, AssetPlot

router = APIRouter()

@router.get("/assets/{asset_ticker}", response_model=AssetType)
def read_asset(asset_ticker: str):
    asset = Asset(asset_ticker)
    return {
        'ticker': asset.ticker,
        'asset_type': asset.asset_type,
        'currency': asset.currency,
        'sector': asset.sector,
    }

@router.get("/assets/{asset_ticker}/price_history", response_model=AssetPlot)
def read_asset_price_history(asset_ticker: str):
    asset = Asset(asset_ticker)
    return {
        'ticker': asset.ticker,
        'plot_type': 'price history',
        'json': asset.plot_price_history().to_json(),
    }

@router.get("/assets/{asset_ticker}/returns_distribution", response_model=AssetPlot)
def read_asset_returns_distribution(asset_ticker: str):
    asset = Asset(asset_ticker)
    return {
        'ticker': asset.ticker,
        'plot_type': 'returns distribution',
        'json': asset.plot_returns_dist().to_json(),
    }

@router.get("/assets/{asset_ticker}/SMA", response_model=AssetPlot)
def read_asset_SMA(asset_ticker: str):
    asset = Asset(asset_ticker)
    return {
        'ticker': asset.ticker,
        'plot_type': 'SMA',
        'json': asset.plot_SMA().to_json(),
    }
