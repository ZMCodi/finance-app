from pydantic import BaseModel, Field
from enum import Enum
from app.models.common import PlotJSON
from typing import List

class AssetType(str, Enum):
    EQUITY = 'Equity'
    CRYPTO = 'Cryptocurrency'
    ETF = 'ETF'
    MUTUAL_FUND = 'Mutual Fund'
    INDEX = 'Index'

class PlotType(str, Enum):
    CANDLESTICK = 'candlestick'
    PRICE_HISTORY = 'price history'
    RETURNS_DISTRIBUTION = 'returns distribution'

class AssetResponse(BaseModel):
    ticker: str = Field(..., title='Ticker', description='The asset ticker according to Yahoo Finance')
    asset_type: AssetType = Field(..., title='Asset Type', description='The type of asset')
    currency: str = Field(..., title='Currency', min_length=3, max_length=3, description='The currency the asset is traded in')
    sector: str | None = Field(..., title='Sector', description='The sector the asset belongs to')

class AssetPlot(BaseModel):
    ticker: str = Field(..., title='Ticker', description='The asset ticker according to Yahoo Finance')
    plot_type: PlotType = Field(..., title='Plot Type', description='The type of plot')
    json_data: List[PlotJSON] = Field(..., title='JSON', description='The JSON representation of the plot')

class ReturnsStats(BaseModel):
    total_returns: float = Field(..., title='Total Returns', description='The total returns of the asset')
    daily_mean: float = Field(..., title='Daily Mean', description='The daily mean returns of the asset')
    daily_std: float = Field(..., title='Daily Std', description='The daily standard deviation of the asset')
    daily_median: float = Field(..., title='Daily Median', description='The daily median returns of the asset')
    annualized_ret: float = Field(..., title='Annualized Returns', description='The annualized returns of the asset')
    annualized_vol: float = Field(..., title='Annualized Volatility', description='The annualized volatility of the asset')

class PriceStats(BaseModel):
    high: float = Field(..., title='High', description='The highest price of the asset')
    low: float = Field(..., title='Low', description='The lowest price of the asset')
    fifty_two_week_high: float = Field(..., title='52 Week High', description='The 52 week high price of the asset', alias='52w_high')
    fifty_two_week_low: float = Field(..., title='52 Week Low', description='The 52 week low price of the asset', alias='52w_low')
    current: float = Field(..., title='Current Price', description='The current price of the asset')

class DistributionStats(BaseModel):
    mean: float = Field(..., title='Mean', description='The mean of the returns distribution')
    std: float = Field(..., title='Standard Deviation', description='The standard deviation of the returns distribution')
    skewness: float = Field(..., title='Skewness', description='The skewness of the returns distribution')
    kurtosis: float = Field(..., title='Kurtosis', description='The kurtosis of the returns distribution')

class AssetStats(BaseModel):
    returns: ReturnsStats = Field(..., title='Returns', description='The returns statistics of the asset')
    price: PriceStats = Field(..., title='Price', description='The price statistics of the asset')
    distribution: DistributionStats = Field(..., title='Distribution', description='The returns distribution statistics of the asset')
    currency: str = Field(..., title='Currency', min_length=3, max_length=3, description='The currency the asset is traded in')

