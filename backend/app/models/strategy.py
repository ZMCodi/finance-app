from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from enum import Enum

class StrategyType(str, Enum):
    ma_crossover = 'MA_Crossover'
    rsi = 'RSI'
    macd = 'MACD'
    bb = 'BB'
    combined = 'Combined'

class MA_ParamType(str, Enum):
    window = 'Window'
    alpha = 'Alpha'
    halflife = 'Half-life'

class RSI_Exit(str, Enum):
    re = 'Re-entry'
    ex = 'Exit'

class CombineType(str, Enum):
    unanimous = 'Unanimous'
    majority = 'Majority'
    weighted = 'Weighted'


class StrategyBase(BaseModel):
    ticker: str = Field(..., title='Ticker', description='The asset ticker according to Yahoo Finance')
    strategy: StrategyType = Field(..., title='Strategy', description='The strategy name')

class StrategyCreate(StrategyBase):
    strategy_id: str = Field(..., title='Strategy ID', description='The unique identifier for the strategy')

class StrategyPlot(StrategyBase):
    json_data: dict = Field(..., title='JSON', description='The JSON representation of the plot')

class StrategyParams(StrategyBase):
    params: Dict[str, float | str | List] = Field(..., title='Parameters', description='The parameters of the strategy')

class StrategySignal(StrategyBase):
    signals: Dict[str, float] = Field(..., title='Signals', description='The signals of the strategy')

class StrategyUpdateParams(BaseModel):
    # MA Crossover
    short: Optional[int] = Field(None, title='Short', description='The short moving average period')
    long: Optional[int] = Field(None, title='Long', description='The long moving average period')
    param_type: Optional[MA_ParamType] = Field(None, title='Param Type', description='The type of parameter to update')
    ewm: Optional[bool] = Field(None, title='Exponential Weighted Moving Average', description='Whether to use exponential weighted moving average')

    # RSI
    ub: Optional[float] = Field(None, title='Upper Bound', description='The upper bound for the RSI')
    lb: Optional[float] = Field(None, title='Lower Bound', description='The lower bound for the RSI')
    window: Optional[int] = Field(None, title='Window', description='The window period for the RSI or MA window for BB')
    exit: Optional[RSI_Exit] = Field(None, title='Exit', description='The type of exit signal')
    m_rev: Optional[bool] = Field(None, title='Mean Reversion', description='Whether to use mean reversion')
    m_rev_bound: Optional[float] = Field(None, title='Mean Reversion Bound', description='The mean reversion bound')

    # MACD
    fast: Optional[int] = Field(None, title='Fast', description='The fast moving average period')
    slow: Optional[int] = Field(None, title='Slow', description='The slow moving average period')
    signal: Optional[int] = Field(None, title='Signal', description='The signal line period')

    # BB
    num_std: Optional[int] = Field(None, title='Number of Standard Deviations', description='The number of standard deviations for the Bollinger Bands')

    # Common
    combine: Optional[CombineType] = Field(None, title='Combine', description='The type of signal combination')
    weights: Optional[List[float]] = Field(None, title='Weights', description='The weights for the signals')
    vote_threshold: Optional[float] = Field(None, title='Vote Threshold', description='The threshold for the vote')