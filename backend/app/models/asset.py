from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class AssetType(str, Enum):
    equity = 'Equity'
    crypto = 'Cryptocurrency'
    etf = 'ETF'
    mutual_fund = 'Mutual Fund'

class AssetResponse(BaseModel):
    ticker: str = Field(..., title='Ticker', description='The asset ticker according to Yahoo Finance')
    asset_type: AssetType = Field(..., title='Asset Type', description='The type of asset')
    currency: str = Field(..., title='Currency', min_length=3, max_length=3, description='The currency the asset is traded in')
    sector: str = Field(..., title='Sector', description='The sector the asset belongs to')

class AssetPlot(BaseModel):
    ticker: str = Field(..., title='Ticker', description='The asset ticker according to Yahoo Finance')
    plot_type: str = Field(..., title='Plot Type', description='The type of plot')
    json: str = Field(..., title='JSON', description='The JSON representation of the plot')
