from pydantic import BaseModel, Field
from typing import Dict, List
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
    params: Dict[str, float] = Field(..., title='Parameters', description='The parameters of the strategy')

class StrategySignal(StrategyBase):
    signals: Dict[str, float] = Field(..., title='Signals', description='The signals of the strategy')

class StrategyUpdateParams(BaseModel):
    # MA Crossover
    short: int = Field(None, title='Short', description='The short moving average period')
    long: int = Field(None, title='Long', description='The long moving average period')
    param_type: MA_ParamType = Field(None, title='Param Type', description='The type of parameter to update')
    ewm: bool = Field(None, title='Exponential Weighted Moving Average', description='Whether to use exponential weighted moving average')

    # RSI
    ub: float = Field(None, title='Upper Bound', description='The upper bound for the RSI')
    lb: float = Field(None, title='Lower Bound', description='The lower bound for the RSI')
    window: int = Field(None, title='Window', description='The window period for the RSI or MA window for BB')
    exit: RSI_Exit = Field(None, title='Exit', description='The type of exit signal')
    m_rev: bool = Field(None, title='Mean Reversion', description='Whether to use mean reversion')
    m_rev_bound: float = Field(None, title='Mean Reversion Bound', description='The mean reversion bound')

    # MACD
    fast: int = Field(None, title='Fast', description='The fast moving average period')
    slow: int = Field(None, title='Slow', description='The slow moving average period')
    signal: int = Field(None, title='Signal', description='The signal line period')

    # BB
    num_std: int = Field(None, title='Number of Standard Deviations', description='The number of standard deviations for the Bollinger Bands')

    # Common
    combine: CombineType = Field(None, title='Combine', description='The type of signal combination')
    weights: List[float] = Field(None, title='Weights', description='The weights for the signals')
    vote_threshold: float = Field(None, title='Vote Threshold', description='The threshold for the vote')