from fastapi import APIRouter, Depends
from app.core.strategy import MA_Crossover, RSI, MACD, BB, CombinedStrategy, Strategy
from app.models.strategy import (StrategyCreate, StrategyPlot, StrategyParams, 
                                 StrategySignal, StrategyUpdateParams,
                                 StrategyAddSignalType, StrategyRemoveSignalType,
                                 StrategyOptimize)
import json
from plotly.utils import PlotlyJSONEncoder
from app.core.asset import Asset
from functools import lru_cache

router = APIRouter(prefix='/api/strategies')

@lru_cache(maxsize=30)
def get_asset(asset_ticker: str):
    return Asset(asset_ticker)

_id = 0
strategy_cache = {'rsi_AAPL_-1': RSI(Asset('AAPL'))}

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

@router.patch('/{strategy_key}/add_signal_type', response_model=StrategyParams)
def add_signal_type(strategy_key: str, signal: StrategyAddSignalType):
    strategy: Strategy = strategy_cache.get(strategy_key)
    strategy.add_signal_type(signal.signal_type.value, signal.weight)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'params': strategy.parameters,
    }

@router.patch('/{strategy_key}/remove_signal_type', response_model=StrategyParams)
def remove_signal_type(strategy_key: str, signal: StrategyRemoveSignalType):
    strategy: Strategy = strategy_cache.get(strategy_key)
    strategy.remove_signal_type(signal.signal_type.value)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'params': strategy.parameters,
    }

# strategies will be added one at a time
@router.post('/combined/create/{strategy_key}', response_model=StrategyCreate)
def create_combined_strategy(strategy_key: str):
    global _id
    strategy: Strategy = strategy_cache.get(strategy_key)
    combined = CombinedStrategy(strategy.asset, strategies=[strategy])
    key = f'combined_{strategy.asset.ticker}_{_id}'
    _id += 1
    strategy_cache[key] = combined
    return {
        'ticker': strategy.asset.ticker,
        'strategy': combined.__class__.__name__,
        'strategy_id': key,
    }

@router.patch('/combined/{combined_key}/{strategy_key}/add_strategy', response_model=StrategyParams)
def add_strategy_to_combined(combined_key: str, strategy_key: str, weight: float = 1.):
    combined: CombinedStrategy = strategy_cache.get(combined_key)
    strategy = strategy_cache.get(strategy_key)
    combined.add_strategy(strategy, weight)
    return {
        'ticker': combined.asset.ticker,
        'strategy': combined.__class__.__name__,
        'params': combined.parameters,
    }

@router.patch('/combined/{combined_key}/{strategy_key}/remove_strategy', response_model=StrategyParams)
def remove_strategy_from_combined(combined_key: str, strategy_key: str):
    combined: CombinedStrategy = strategy_cache.get(combined_key)
    strategy = strategy_cache.get(strategy_key)
    combined.remove_strategy(strategy)
    return {
        'ticker': combined.asset.ticker,
        'strategy': combined.__class__.__name__,
        'params': combined.parameters,
    }

@router.get('/{strategy_key}/backtest', response_model=StrategyPlot)
def backtest(strategy_key: str, timeframe: str = '1d', start_date: str = None, end_date: str = None):
    strategy: Strategy = strategy_cache.get(strategy_key)
    res, fig = strategy.backtest(plot=True, timeframe=timeframe, start_date=start_date, end_date=end_date)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'results': res.to_dict(),
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get('/{strategy_key}/optimize/params', response_model=StrategyOptimize)
def optimize_parameters(strategy_key: str, timeframe: str = '1d', start_date: str = None, end_date: str = None):
    strategy: Strategy = strategy_cache.get(strategy_key)
    res = strategy.optimize(timeframe=timeframe, start_date=start_date, end_date=end_date)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'results': res,
    }

@router.get('/{strategy_key}/optimize/weights', response_model=StrategyOptimize)
def optimize_weights(strategy_key: str, timeframe: str = '1d', start_date: str = None, end_date: str = None, runs: int = 20):
    strategy: Strategy = strategy_cache.get(strategy_key)
    res = strategy.optimize_weights(timeframe=timeframe, start_date=start_date, end_date=end_date, runs=runs)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'results': res,
    }
