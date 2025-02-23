from fastapi import APIRouter, Depends
from app.core.strategy import MA_Crossover, RSI, MACD, BB, CombinedStrategy, Strategy
from app.models.strategy import StrategyCreate, StrategyPlot, StrategyParams, StrategySignal, StrategyUpdateParams
import json
from plotly.utils import PlotlyJSONEncoder
from app.core.asset import Asset
from functools import lru_cache

router = APIRouter(prefix='/api/strategies')

@lru_cache(maxsize=30)
def get_asset(asset_ticker: str):
    return Asset(asset_ticker)

_id = 0
strategy_cache = {}

@router.post('/{asset_ticker}/{strategy_name}', response_model=StrategyCreate)
def create_strategy(strategy_name: str, asset: Asset = Depends(get_asset)):
    global _id
    if strategy_name == 'ma_crossover':
        strategy = MA_Crossover(asset)
    elif strategy_name == 'rsi':
        strategy = RSI(asset)
    elif strategy_name == 'macd':
        strategy = MACD(asset)
    elif strategy_name == 'bb':
        strategy = BB(asset)
    else:
        raise ValueError(f'Invalid strategy name: {strategy_name}')
    key = f'{strategy_name}_{asset.ticker}_{_id}'
    _id += 1
    strategy_cache[key] = strategy
    return {
        'strategy': strategy.__class__.__name__,
        'ticker': asset.ticker,
        'strategy_id': key,
    }

@router.get("/cache")
def get_cache():
    return str(strategy_cache)

@router.get('/{strategy_key}/indicator', response_model=StrategyPlot)
def plot_strategy(strategy_key: str, 
                  timeframe: str = '1d', 
                  start_date: str = None, 
                  end_date: str = None,
                  ):
    strategy: Strategy = strategy_cache.get(strategy_key)
    fig = strategy.plot(timeframe, start_date, end_date)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get('/{strategy_key}/params', response_model=StrategyParams)
def get_strategy_params(strategy_key: str):
    strategy: Strategy = strategy_cache.get(strategy_key)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'params': strategy.parameters,
    }

@router.get('/{strategy_key}/signals', response_model=StrategySignal)
def get_strategy_signals(strategy_key: str, timeframe: str = '1d', start_date: str = None, end_date: str = None):
    strategy: Strategy = strategy_cache.get(strategy_key)
    if timeframe == '1d':
        signal = strategy.daily['signal']
    elif timeframe == '5m':
        signal = strategy.five_minute['signal']

    if start_date is not None:
        signal = signal.loc[start_date:]
    if end_date is not None:
        signal = signal.loc[:end_date]

    _format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'
    signal.index = signal.index.strftime(_format)
    signal = signal.to_dict()
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'signals': signal,
    }

@router.patch('/{strategy_key}/params', response_model=StrategyParams)
def update_strategy_params(strategy_key: str, params: StrategyUpdateParams):
    strategy: Strategy = strategy_cache.get(strategy_key)
    param_updates = params.model_dump(exclude_unset=True)
    strategy.change_params(**param_updates)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'params': strategy.parameters,
    }

# implement optimize, backtest, add and delete signal type and strategies and combined strategy