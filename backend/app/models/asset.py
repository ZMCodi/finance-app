from pydantic import BaseModel, Field
from typing import Dict
from enum import Enum

class AssetType(str, Enum):
    EQUITY = 'Equity'
    CRYPTO = 'Cryptocurrency'
    ETF = 'ETF'
    MUTUAL_FUND = 'Mutual Fund'

class PlotType(str, Enum):
    CANDLESTICK = 'candlestick'
    PRICE_HISTORY = 'price history'
    RETURNS_DISTRIBUTION = 'returns distribution'

class AssetResponse(BaseModel):
    ticker: str = Field(..., title='Ticker', description='The asset ticker according to Yahoo Finance')
    asset_type: AssetType = Field(..., title='Asset Type', description='The type of asset')
    currency: str = Field(..., title='Currency', min_length=3, max_length=3, description='The currency the asset is traded in')
    sector: str = Field(..., title='Sector', description='The sector the asset belongs to')

class AssetPlot(BaseModel):
    ticker: str = Field(..., title='Ticker', description='The asset ticker according to Yahoo Finance')
    plot_type: PlotType = Field(..., title='Plot Type', description='The type of plot')
    json_data: dict = Field(..., title='JSON', description='The JSON representation of the plot')

class AssetStats(BaseModel):
    stats: Dict[str, Dict[str, float]] = Field(..., title='Stats', description='The statistics of the asset')
