from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from enum import Enum
from app.models.common import PlotJSON

class StrategyType(str, Enum):
    MA_CROSSOVER = 'MA_Crossover'
    RSI = 'RSI'
    MACD = 'MACD'
    BOLLINGER_BANDS = 'BB'
    COMBINED = 'CombinedStrategy'

class MA_ParamType(str, Enum):
    WINDOW = 'window'
    ALPHA = 'alpha'
    HALF_LIFE = 'halflife'

class RSI_Exit(str, Enum):
    RE_ENTRY = 're'
    EXIT = 'ex'

class VoteMethod(str, Enum):
    UNANIMOUS = 'unanimous'
    MAJORITY = 'majority'
    WEIGHTED = 'weighted'

class SignalType(str, Enum):
    # RSI
    CROSSOVER = 'crossover'
    DIVERGENCE = 'divergence'
    HIDDEN_DIVERGENCE = 'hidden divergence'

    # MACD
    MOMENTUM = 'momentum'
    DOUBLE_PEAKS_TROUGHS = 'double peak/trough'

    # BB
    BOUNCE = 'bounce'
    DOUBLE = 'double'
    WALKS = 'walks'
    SQUEEZE = 'squeeze'
    BREAKOUT = 'breakout'
    PCT_B = '%B'

class OptimizeResults(BaseModel):
    hold_returns: float = Field(..., title='Hold Returns', description='The returns of holding the asset')
    strategy_returns: float = Field(..., title='Strategy Returns', description='The returns of the strategy')
    net: float = Field(..., title='Net Returns', description='The net returns of the strategy')

class OptimizeWeightResults(BaseModel):
    weights: List[float] = Field(..., title='Weights', description='The optimized weights')
    vote_threshold: float = Field(..., title='Results', description='The voting threshold for the optimized weights')
    results: OptimizeResults = Field(..., title='Results', description='The results of the optimization')

class OptimizeParamsResults(BaseModel):
    params: Dict[str, float] = Field(..., title='Parameters', description='The optimized parameters')
    results: OptimizeResults = Field(..., title='Results', description='The results of the optimization')

class StrategyBase(BaseModel):
    ticker: str = Field(..., title='Ticker', description='The asset ticker according to Yahoo Finance')
    strategy: StrategyType = Field(..., title='Strategy', description='The strategy name')

class StrategyCreate(StrategyBase):
    strategy_id: str = Field(..., title='Strategy ID', description='The unique identifier for the strategy')

class StrategyPlot(StrategyBase):
    results: Optional[Dict[str, float]] = Field(None, title='Results', description='The results of the backtest')
    json_data: PlotJSON = Field(..., title='JSON', description='The JSON representation of the plot')

class StrategyParams(StrategyBase):
    params: Dict[str, float | str | List] = Field(..., title='Parameters', description='The parameters of the strategy')

class StrategySignal(StrategyBase):
    signals: Dict[str, float] = Field(..., title='Signals', description='The buy/sell signals of the strategy')

class StrategyUpdateParams(BaseModel):
    # MA Crossover
    short: Optional[int | float] = Field(None, title='Short', description='The short moving average period')
    long: Optional[int | float] = Field(None, title='Long', description='The long moving average period')
    param_type: Optional[MA_ParamType] = Field(None, title='Param Type', description='The type of parameter to update')
    ewm: Optional[bool] = Field(None, title='Exponential Weighted Moving Average', description='Whether to use exponential weighted moving average')

    # RSI
    ub: Optional[int | float] = Field(None, title='Upper Bound', description='The upper bound for the RSI')
    lb: Optional[int | float] = Field(None, title='Lower Bound', description='The lower bound for the RSI')
    window: Optional[int] = Field(None, title='Window', description='The window period for the RSI or MA window for BB')
    exit: Optional[RSI_Exit] = Field(None, title='Exit', description='The type of exit signal')
    m_rev: Optional[bool] = Field(None, title='Mean Reversion', description='Whether to use mean reversion')
    m_rev_bound: Optional[int | float] = Field(None, title='Mean Reversion Bound', description='The mean reversion bound')

    # MACD
    fast: Optional[int] = Field(None, title='Fast', description='The fast moving average period')
    slow: Optional[int] = Field(None, title='Slow', description='The slow moving average period')
    signal: Optional[int] = Field(None, title='Signal', description='The signal line period')

    # BB
    num_std: Optional[int | float] = Field(None, title='Number of Standard Deviations', description='The number of standard deviations for the Bollinger Bands')

    # Common
    method: Optional[VoteMethod] = Field(None, title='Vote Method', description='The voting method for multiple signals')
    weights: Optional[List[float]] = Field(None, title='Weights', description='The weights for the signals')
    vote_threshold: Optional[float] = Field(None, title='Vote Threshold', description='The threshold for the vote')
    signal_type: Optional[List[SignalType]] = Field(None, title='Signals', description='The signal types to use')

class StrategyOptimize(StrategyBase):
    results: OptimizeParamsResults | OptimizeWeightResults = Field(..., title='Results', description='The results of the optimization')
