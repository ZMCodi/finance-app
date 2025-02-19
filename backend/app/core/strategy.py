''' Strategy module for implementing and backtesting technical analysis trading strategies

Key components:
- TAEngine: Technical analysis calculation engine with caching for efficient computation
- Strategy base class with plotting, backtesting and optimization capabilities
- Concrete strategy implementations:
    - Moving Average Crossover
    - RSI with multiple signal types
    - MACD with multiple signal types  
    - Bollinger Bands with multiple signal types
    - Combined strategy approach with signal voting

Features:
- Strategy visualization with interactive Plotly charts
- Backtesting with customizable parameters and timeframes
- Parameter optimization via grid search
- Strategy weights optimization
- Signal combination through weighted voting
'''

from abc import ABC, abstractmethod
from itertools import product
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
from pandas.core.frame import DataFrame
import numpy as np
import signal_gen as sg
import scipy.optimize as sco
from assets import Asset
from typing import Optional
from datetime import datetime, date
import multiprocessing as mp

DateLike = str | datetime | date | pd.Timestamp

class TAEngine:
    """Technical Analysis calculation engine with caching capabilities.
    
    A utility class that provides methods to calculate common technical indicators
    while caching results to avoid redundant computations. Can be used standalone
    or as part of strategy implementations.

    The engine caches results using a combination of parameters and data name
    as keys, allowing efficient reuse when the same calculations are needed
    multiple times, such as during optimization.

    Attributes:
        cache (dict): Dictionary storing computed technical indicators
    """

    def __init__(self):
        """Initialize an empty cache for storing computed indicators."""
        self.cache = {}

    def calculate_ma(self, data: pd.Series, ewm: bool, param_type: str, 
                    param: float, name: str) -> pd.Series:
        """Calculate moving average with caching.

        Computes either simple moving average or exponential weighted moving
        average based on specified parameters. Results are cached using a key
        that combines all parameters.

        Args:
            data (pd.Series): Price series to calculate MA for
            ewm (bool): If True, use exponential weighted moving average.
                If False, use simple moving average
            param_type (str): Parameter type for the moving average.
                Can be 'window', 'span', 'com', 'halflife', or 'alpha'
            param (float): Value for the specified parameter type
            name (str): Identifier for the data series, used in cache key

        Returns:
            pd.Series: Moving average series
        """
        key = f'ma_{param_type}={param}, {name=}'
        if key not in self.cache:
            if ewm:
                self.cache[key] = data.ewm(**{f'{param_type}': param}).mean()
            else:
                self.cache[key] = data.rolling(window=param).mean()

        return self.cache[key]

    def calculate_rsi(self, data: pd.Series, window: int, name: str) -> pd.Series:
        """Calculate Relative Strength Index (RSI) with caching.

        Computes RSI using the standard formula with exponential weighted
        moving averages for the gains and losses.

        Args:
            data (pd.Series): Price series to calculate RSI for
            window (int): Lookback period for RSI calculation
            name (str): Identifier for the data series, used in cache key

        Returns:
            pd.Series: RSI values ranging from 0 to 100
        """
        key = f'rsi_window={window}, {name=}'
        if key not in self.cache:
            delta = data.diff()
            gain = (delta.where(delta > 0, 0)).ewm(alpha=1/window, min_periods=window).mean()
            loss = (-delta.where(delta < 0, 0)).ewm(alpha=1/window, min_periods=window).mean()
            rs = gain / loss
            self.cache[key] = 100 - (100 / (1 + rs))

        return self.cache[key]

    def calculate_macd(self, data: pd.Series, windows: list[int], name: str) -> pd.DataFrame:
        """Calculate Moving Average Convergence Divergence (MACD) with caching.

        Computes MACD using three exponential moving averages:
        - Fast EMA
        - Slow EMA 
        - Signal line EMA on the MACD line

        The function converts the window periods to alpha values and caches
        the results including the MACD line, signal line, and histogram.

        Args:
            data (pd.Series): Price series to calculate MACD for
            windows (list[int]): Three window periods [fast, slow, signal]
                where fast < slow and signal is for the MACD line
            name (str): Identifier for the data series, used in cache key

        Returns:
            pd.DataFrame: DataFrame with columns:
                - macd: The MACD line (fast EMA - slow EMA)
                - signal_line: EMA of the MACD line
                - macd_hist: MACD histogram (signal_line - macd)
        """
        key = f'macd_{windows=}, {name=}'
        if key not in self.cache:
            results = pd.DataFrame(index=data.index)

            alpha_fast = 2 / (windows[0] + 1)
            alpha_slow = 2 / (windows[1] + 1)
            alpha_signal = 2 / (windows[2] + 1)

            results['macd'] = (self.calculate_ma(data, True, 'alpha', alpha_fast, name)
                                - self.calculate_ma(data, True, 'alpha', alpha_slow, name))

            results['signal_line'] = self.calculate_ma(results['macd'], True, 'alpha', alpha_signal, name)

            results['macd_hist'] = results['signal_line'] - results['macd']

            self.cache[key] = results

        return self.cache[key]

    def rolling_std(self, data: pd.Series, ewm: bool, param_type: str, 
                    param: float, name: str) -> pd.Series:
        """Calculate rolling standard deviation with caching.

        Computes either simple rolling standard deviation or exponential weighted
        standard deviation based on specified parameters.

        Args:
            data (pd.Series): Price series to calculate standard deviation for
            ewm (bool): If True, use exponential weighted standard deviation.
                If False, use simple rolling standard deviation
            param_type (str): Parameter type for the calculation.
                Can be 'window', 'span', 'com', 'halflife', or 'alpha'
            param (float): Value for the specified parameter type
            name (str): Identifier for the data series, used in cache key

        Returns:
            pd.Series: Rolling standard deviation series
        """
        key = f'rol_std_{param_type}={param}, {name=}'
        if key not in self.cache:
            if ewm:
                self.cache[key] = data.ewm(**{f'{param_type}': param}).std()
            else:
                self.cache[key] = data.rolling(window=param).std()

        return self.cache[key]

    def calculate_bb(self, data: pd.Series, window: int, num_std: float, 
                    name: str) -> pd.DataFrame:
        """Calculate Bollinger Bands with caching.

        Computes Bollinger Bands using:
        - Simple moving average (middle band)
        - Upper band: SMA + (standard deviation × num_std)
        - Lower band: SMA - (standard deviation × num_std)

        Args:
            data (pd.Series): Price series to calculate Bollinger Bands for
            window (int): Window period for the moving average and standard deviation
            num_std (float): Number of standard deviations for the bands
            name (str): Identifier for the data series, used in cache key

        Returns:
            pd.DataFrame: DataFrame with columns:
                - sma: Simple moving average (middle band)
                - bol_up: Upper Bollinger Band
                - bol_down: Lower Bollinger Band
        """
        key = f'bb_{window=}_{num_std=}, {name}'
        if key not in self.cache:
            results = pd.DataFrame(index=data.index)

            results['sma'] = self.calculate_ma(data, False, 'window', window, name)
            std = self.rolling_std(data, False, 'window', window, name)
            results['bol_up'] = results['sma'] + num_std * std
            results['bol_down'] = results['sma'] - num_std * std

            self.cache[key] = results

        return self.cache[key]


class Strategy(ABC):
    """Abstract base class for implementing trading strategies.
    
    Provides a framework for creating technical analysis trading strategies with
    built-in backtesting, visualization, and optimization capabilities. All concrete
    strategy implementations should inherit from this class and implement the
    abstract methods.

    The class handles both daily and 5-minute data timeframes, supports parameter
    optimization through grid search, and allows strategy visualization through
    Plotly interactive charts.

    Attributes:
        asset (Asset): Asset object containing price data and metadata
        daily (pd.DataFrame): DataFrame containing daily trading signals and returns
        five_min (pd.DataFrame): DataFrame containing 5-minute trading signals and returns
        params (str): String representation of strategy parameters

    Abstract Methods:
        plot: Visualize the strategy and its signals
        optimize: Optimize strategy parameters using grid search
    """

    def __init__(self, asset: Asset):
        """Initialize the strategy for a given asset.

        Args:
            asset (Asset): Asset object containing price data and metadata
        """
        self.asset = asset

    @abstractmethod
    def plot(self):
        """Plot strategy indicators and signals.
        
        To be implemented by concrete strategy classes.
        Should create visualization showing strategy indicators and generated signals.
        """
        pass

    @abstractmethod
    def optimize(self):
        """Optimize strategy parameters.
        
        To be implemented by concrete strategy classes.
        Should perform grid search over parameter space to find optimal settings.
        """
        pass

    def backtest(self, plot: bool = True, timeframe: str = '1d', 
                start_date: Optional[DateLike] = None, end_date: Optional[DateLike] = None, 
                show_signal: bool = True) -> pd.Series:
        """Backtest the strategy and optionally plot results.

        Performs backtesting by applying the strategy's signals to historical data
        and calculating cumulative returns. Can visualize the results using an
        interactive Plotly chart showing both buy-and-hold and strategy returns.

        Args:
            plot (bool, optional): Whether to create visualization. Defaults to True.
            timeframe (str, optional): Data frequency to use ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date for backtest. Defaults to None.
            end_date (DateLike, optional): End date for backtest. Defaults to None.
            show_signal (bool, optional): Whether to plot signals. Defaults to True.

        Returns:
            pd.Series: Series with two values:
                - returns: Buy-and-hold cumulative returns
                - strategy: Strategy cumulative returns
        """
        name = self.__class__.__name__
        df = self.daily.copy() if timeframe == '1d' else self.five_min.copy()
        df.dropna(inplace=True)

        if start_date is not None:
            df = df[df.index >= start_date]
        if end_date is not None:
            df = df[df.index <= end_date]

        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        if plot:
            trace1 = go.Scatter(
                x=df.index.strftime(format),
                y=np.exp(df['returns'].cumsum()),
                line=dict(
                    color='#2962FF',
                    width=2,
                    dash='solid'
                ),
                name=f'{self.asset.ticker} Hold Returns',
                yaxis='y'
            )

            trace2 = go.Scatter(
                x=df.index.strftime(format),
                y=np.exp(df['strategy'].cumsum()),
                line=dict(
                    color='red',
                    width=2,
                    dash='solid'
                ),
                name=f'{self.asset.ticker} Strategy Returns',
                yaxis='y'
            )

            if show_signal:
                trace3 = go.Scatter(
                    x=df.index.strftime(format),
                    y=df['signal'],
                    line=dict(color='green', width=0.8, dash='solid'),
                    name='Buy/Sell signal',
                    yaxis='y2'
                )


            fig = go.Figure()

            fig.add_trace(trace1)
            fig.add_trace(trace2)

            if show_signal:
                fig.add_trace(trace3)

            # Update layout with secondary y-axis
            layout = {}

            layout['title'] = dict(
                    text=f'{self.asset.ticker} {name} Backtest {self.params}',
                    x=0.5,
                    y=0.95
                )

            layout['xaxis'] = dict(
                    showgrid=True,
                    gridwidth=1,
                    gridcolor='rgba(128,128,128,0.2)',
                    title=None,
                    type='category',
                    categoryorder='category ascending',
                    nticks=5
                )

            layout['yaxis'] = dict(
                    showgrid=True,
                    gridwidth=1,
                    gridcolor='rgba(128,128,128,0.2)',
                    title=f'Returns',
                )

            if show_signal:
                layout['yaxis2'] = dict(
                        title='Signal',
                        overlaying='y',
                        side='right',
                        range=[-1.1, 1.1],
                        tickmode='array',
                        tickvals=[-1, 1],
                        ticktext=['Sell', 'Buy']
                    )

            layout['legend'] = dict(
                    yanchor="bottom",
                    y=1.02,
                    xanchor="center",
                    x=0.5,
                    orientation="h",
                    bgcolor='rgba(255,255,255,0.8)'
                )

            fig.update_layout(**layout,
                                paper_bgcolor='white',
                                plot_bgcolor='rgba(240,240,240,0.95)',
                                hovermode='x unified')

            fig.show()

        return np.exp(df[['returns', 'strategy']].sum())
    
    @staticmethod
    def _single_optimization(args):
        """Helper function to run a single optimization with random initialization."""
        strategy, n_weights, t_min, t_max, timeframe, start_date, end_date = args
        
        # Random initial weights that sum to 1
        init_weights = np.random.dirichlet(np.ones(n_weights))
        init_threshold = np.random.uniform(t_min, t_max)
        init_params = np.concatenate([init_weights, [init_threshold]])
        
        def objective_function(params):
            weights = params[:-1]
            threshold = params[-1]
            
            # Evaluate combined signal with given weights
            strategy.change_params(weights=weights, vote_threshold=threshold)
            combined_returns = strategy.backtest(plot=False,
                                            timeframe=timeframe,
                                            start_date=start_date,
                                            end_date=end_date)['strategy']
            
            # Add regularization terms
            diversity_bonus = 0.1 * np.sum(-weights * np.log(weights + 1e-10))
            extreme_penalty = 0.05 * np.sum(weights ** 2)
            
            return -combined_returns - diversity_bonus + extreme_penalty
        
        cons = ({
            'type': 'eq',
            'fun': lambda x: np.sum(x[:-1]) - 1
        })
        
        bnds = tuple([(0, 1)] * n_weights + [(t_min, t_max)])
        
        result = sco.minimize(objective_function, init_params,
                            method='SLSQP', bounds=bnds,
                            constraints=cons)
        
        return result.fun, result.x

    def optimize_weights(self, inplace: bool = False, timeframe: str = '1d',
                        start_date: Optional[DateLike] = None, end_date: Optional[DateLike] = None,
                        threshold_range: Optional[np.ndarray] = None, 
                        runs: int = 20) -> tuple[np.ndarray, float]:
        """Optimize signal combination weights and voting threshold using parallel processing.
        
        Uses parallel processing to run multiple optimization attempts with different
        random initializations simultaneously. Each optimization uses scipy's SLSQP
        optimizer to find optimal weights for combining multiple signals. Includes regularization 
        to prevent extreme weights and entropy bonus to encourage weight diversity.
        
        Args:
            inplace (bool, optional): Whether to update strategy weights. Defaults to False.
            timeframe (str, optional): Data frequency to use ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date for optimization. Defaults to None.
            end_date (DateLike, optional): End date for optimization. Defaults to None.
            threshold_range (np.ndarray, optional): Range of voting thresholds to test.
                Defaults to np.arange(0.2, 0.9, 0.1).
            runs (int, optional): Number of random initializations. Defaults to 20.
            n_processes (int, optional): Number of processes to use. Defaults to None (CPU count).

        Returns:
            tuple[np.ndarray, float]: Tuple containing:
                - Optimal weights for each signal
                - Optimal voting threshold
        """
        old_params = {'weights': self.weights, 'vote_threshold': self.vote_threshold}

        n_weights = len(self.weights)
        if threshold_range is None:
            threshold_range = np.arange(0.2, 0.9, 0.1)

        t_min, t_max = threshold_range[0], threshold_range[-1]

        # Prepare arguments for parallel processing
        args = [(self, n_weights, t_min, t_max, timeframe, start_date, end_date)
                for _ in range(runs)]

        # Run optimizations in parallel
        with mp.Pool(mp.cpu_count()) as pool:
            results = pool.map(self._single_optimization, args)

        # Find best result
        best_value, best_params = min(results, key=lambda x: x[0])

        # Split results
        opt_weights = best_params[:-1] / np.sum(best_params[:-1])
        opt_threshold = best_params[-1]

        if inplace:
            self.change_params(weights=opt_weights, vote_threshold=opt_threshold)
        else:
            self.change_params(**old_params)

        return opt_weights, float(opt_threshold)

    @property 
    def num_signals_daily(self) -> int:
        """Count the number of signal changes in daily data.

        Returns:
            int: Number of times the trading signal changes from -1 to 1 or vice versa
        """
        return np.sum(np.where(self.daily['signal'].shift(1) != self.daily['signal'], 1, 0))

    @property
    def num_signals_five_min(self) -> int:
        """Count the number of signal changes in 5-minute data.

        Returns:
            int: Number of times the trading signal changes from -1 to 1 or vice versa
        """
        return np.sum(np.where(self.five_min['signal'].shift(1) != self.five_min['signal'], 1, 0))


class MA_Crossover(Strategy):
    """Moving Average Crossover trading strategy implementation.
    
    Implements a strategy based on crossovers between a short-term and long-term
    moving average. Generates buy signals when the short-term MA crosses above
    the long-term MA, and sell signals for crossovers in the opposite direction.

    Supports both simple and exponential moving averages with flexible parameter
    types including window periods, spans, half-lives, and alpha values.

    Attributes:
        asset (Asset): Asset to apply the strategy to
        ptype (str): Parameter type for moving averages ('window', 'alpha', or 'halflife')
        ewm (bool): Whether to use exponential weighted averages
        short (float): Short-term moving average parameter
        long (float): Long-term moving average parameter
        engine (TAEngine): Technical analysis calculation engine
        params (str): String representation of strategy parameters (short/long)
        daily (pd.DataFrame): Daily data with signals and strategy returns
        five_min (pd.DataFrame): 5-minute data with signals and strategy returns
    """

    def __init__(self, asset: Asset, param_type: str = 'window', 
                short_window: int = 20, long_window: int = 50,
                short_alpha: Optional[float] = None, 
                long_alpha: Optional[float] = None,
                short_halflife: Optional[float] = None, 
                long_halflife: Optional[float] = None, 
                ewm: bool = False):
        """Initialize the Moving Average Crossover strategy.

        Args:
            asset (Asset): Asset to apply the strategy to
            param_type (str, optional): Type of parameter to use ('window', 'alpha', or 'halflife').
                Defaults to 'window'.
            short_window (int, optional): Short MA window period. Defaults to 20.
            long_window (int, optional): Long MA window period. Defaults to 50.
            short_alpha (float, optional): Short MA alpha value. Defaults to None.
            long_alpha (float, optional): Long MA alpha value. Defaults to None.
            short_halflife (float, optional): Short MA half-life. Defaults to None.
            long_halflife (float, optional): Long MA half-life. Defaults to None.
            ewm (bool, optional): Whether to use exponential weighted MA. Defaults to False.

        Notes:
            Only one set of parameters should be provided based on param_type:
            - For param_type='window': use short_window and long_window
            - For param_type='alpha': use short_alpha and long_alpha
            - For param_type='halflife': use short_halflife and long_halflife
        """
        super().__init__(asset)
        self.ptype = param_type
        self.ewm = ewm
        self.__short = eval(f'short_{param_type}')
        self.__long = eval(f'long_{param_type}')
        self.engine = TAEngine()
        self.__get_data()

    def __str__(self) -> str:
        """String representation of the strategy.

        Returns:
            str: Strategy description with parameters
        """
        return f'MA_Crossover({self.asset.ticker}, short_{self.ptype}={self.short}, long_{self.ptype}={self.long})'

    def __get_data(self) -> None:
        """Calculate moving averages and generate trading signals.
        
        Updates both daily and 5-minute dataframes with:
        - Short and long moving averages
        - Trading signals (-1 for sell, 1 for buy)
        - Strategy returns (signal * returns)
        """
        self.daily = pd.DataFrame(self.asset.daily[['adj_close', 'log_rets']].copy())
        self.five_min = pd.DataFrame(self.asset.five_minute[['adj_close', 'log_rets']].copy())
        self.params = f'({self.short}/{self.long})'

        for i, df in enumerate([self.daily, self.five_min]):
            data = df['adj_close']
            name = 'daily' if i == 0 else 'five_min'
            ptype = 'span' if self.ptype == 'window' and self.ewm else self.ptype

            df['short'] = self.engine.calculate_ma(data, self.ewm, ptype, self.short, name)
            df['long'] = self.engine.calculate_ma(data, self.ewm, ptype, self.long, name)
            df.dropna(inplace=True)

            df['signal'] = sg.ma_crossover(df['short'], df['long'])
            df.rename(columns=dict(log_rets='returns'), inplace=True)
            df['strategy'] = df['returns'] * df['signal']
            if i == 0:
                self.daily = df
            else:
                self.five_min = df

    @property
    def short(self) -> float:
        return self.__short

    @short.setter
    def short(self, value: float) -> None:
        self.__short = value
        self.__get_data()

    @property
    def long(self) -> float:
        return self.__long

    @long.setter
    def long(self, value: float) -> None:
        self.__long = value
        self.__get_data()

    def change_params(self, param_type: Optional[str] = None, 
                     short: Optional[float] = None, 
                     long: Optional[float] = None,
                     ewm: Optional[bool] = None) -> None:
        """Update multiple strategy parameters at once.

        Args:
            param_type (str, optional): New parameter type. Defaults to None.
            short (float, optional): New short MA parameter. Defaults to None.
            long (float, optional): New long MA parameter. Defaults to None.
            ewm (bool, optional): Whether to use EMA. Defaults to None.
        """
        self.ptype = param_type if param_type is not None else self.ptype
        self.__short = short if short is not None else self.short
        self.__long = long if long is not None else self.long
        self.ewm = ewm if ewm is not None else self.ewm
        self.__get_data()

    def plot(self, timeframe: str = '1d', 
            start_date: Optional[DateLike] = None,
            end_date: Optional[DateLike] = None, 
            show_signal: bool = True) -> go.Figure:
        """Create interactive plot of moving averages and signals.

        Args:
            timeframe (str, optional): Data frequency to plot ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date to plot from. Defaults to None.
            end_date (DateLike, optional): End date to plot to. Defaults to None.
            show_signal (bool, optional): Whether to show trading signals. Defaults to True.

        Returns:
            go.Figure: Plotly figure with moving averages and optional signals
        """
        df = self.daily.copy() if timeframe == '1d' else self.five_min.copy()

        if start_date is not None:
            df = df[df.index >= start_date]
        if end_date is not None:
            df = df[df.index <= end_date]

        df.dropna(inplace=True)

        long_data = df['long']
        short_data = df['short']

        if show_signal:
            signal = df['signal']

        short_param = f'{self.ptype}={self.short}'
        long_param = f'{self.ptype}={self.long}'
        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        # Add short MA line
        short_MA = go.Scatter(
            x=short_data.index.strftime(format),
            y=short_data,
            line=dict(
                color='#2962FF',
                width=2,
                dash='solid'
            ),
            name=f'{self.asset.ticker} MA ({short_param})',
            yaxis='y'
        )

        # Add long MA line
        long_MA = go.Scatter(
            x=long_data.index.strftime(format),
            y=long_data,
            line=dict(
                color='red',
                width=2,
                dash='solid'
            ),
            name=f'{self.asset.ticker} MA ({long_param})',
            yaxis='y'
        )

        if show_signal:
            signal = go.Scatter(
                x=signal.index.strftime(format),
                y=signal,
                line=dict(color='green', width=0.8, dash='solid'),
                name='Buy/Sell signal',
                yaxis='y2'
            )

        # Add traces based on whether it's a subplot or not
        fig = go.Figure()

        fig.add_trace(short_MA)

        fig.add_trace(long_MA)

        if show_signal:
            fig.add_trace(signal)

        # Update layout with secondary y-axis
        layout = {}

        layout['title'] = dict(
                text=f'{self.asset.ticker} MA Crossover {self.params}',
                x=0.5,
                y=0.95
            )

        layout['xaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=None,
                type='category',
                categoryorder='category ascending',
                nticks=5
            )

        layout['yaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=f'Price ({self.asset.currency})',
            )

        if show_signal:
            layout['yaxis2'] = dict(
                    title='Signal',
                    overlaying='y',
                    side='right',
                    range=[-1.1, 1.1],  # Give some padding to the 0/1 signal
                    tickmode='array',
                    tickvals=[-1, 1],
                    ticktext=['Sell', 'Buy']
                )

        layout['legend'] = dict(
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
                orientation="h",  # horizontal layout
                bgcolor='rgba(255,255,255,0.8)'
            )

        fig.update_layout(**layout,
                            paper_bgcolor='white',
                            plot_bgcolor='rgba(240,240,240,0.95)',
                            hovermode='x unified')


        fig.show()

        return fig

    def optimize(self, inplace: bool = False, timeframe: str = '1d',
                start_date: Optional[DateLike] = None, 
                end_date: Optional[DateLike] = None,
                short_range: Optional[np.ndarray] = None,
                long_range: Optional[np.ndarray] = None) -> pd.DataFrame:
        """Optimize moving average parameters through grid search.

        Tests combinations of short and long parameters to find the best performing
        settings based on strategy returns vs buy-and-hold returns.

        Args:
            inplace (bool, optional): Whether to update strategy parameters. Defaults to False.
            timeframe (str, optional): Data frequency to use ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date for optimization. Defaults to None.
            end_date (DateLike, optional): End date for optimization. Defaults to None.
            short_range (np.ndarray, optional): Range of short MA parameters to test.
                Defaults to appropriate ranges based on param_type.
            long_range (np.ndarray, optional): Range of long MA parameters to test.
                Defaults to appropriate ranges based on param_type.

        Returns:
            pd.DataFrame: Results sorted by net returns (strategy - hold), containing:
                - short: Short MA parameter
                - long: Long MA parameter
                - hold_returns: Buy-and-hold returns
                - strategy_returns: Strategy returns
                - net: Net returns (strategy - hold)
        """
        if short_range is None:
            if self.ptype == 'window':
                short_range = np.arange(20, 61, 5)  # window
            else:
                short_range = np.arange(0.10, 0.31, 0.03)  # alpha
                if self.ptype == 'halflife':
                    short_range = -np.log(2) / np.log(1 - short_range)  # halflife

        if long_range is None:
            if self.ptype == 'window':
                long_range = np.arange(100, 281, 10)
            else:
                long_range = np.arange(0.01, 0.11, 0.02)  # alpha
                if self.ptype == 'halflife':
                    long_range = -np.log(2) / np.log(1 - long_range)  # halflife

        old_params = {'short': self.short, 'long': self.long, 'ewm': self.ewm, 'param_type': self.ptype}

        results = []
        for short, long in product(short_range, long_range):
            if self.ptype == 'alpha' and short <= long:
                continue
            elif short >= long:
                continue

            self.change_params(short=short, long=long)
            backtest_results = self.backtest(plot=False, 
                                        timeframe=timeframe, 
                                        start_date=start_date,
                                        end_date=end_date)
            results.append((short, long, backtest_results['returns'], backtest_results['strategy']))

        results = pd.DataFrame(results, columns=['short', 'long', 'hold_returns', 'strategy_returns'])
        results['net'] = results['strategy_returns'] - results['hold_returns']
        results = results.sort_values(by='net', ascending=False)

        opt_short = results.iloc[0]['short']
        opt_long = results.iloc[0]['long']

        if self.ptype == 'window':
            opt_short = int(opt_short)
            opt_long = int(opt_long)

        if inplace:
            self.change_params(short=opt_short, long=opt_long)
        else:
            self.change_params(**old_params)

        return results

    def optimize_weights(self):
        """Not implemented for MA Crossover strategy.

        Raises:
            NotImplementedError: MA Crossover uses single signal, no weights to optimize
        """
        raise NotImplementedError("No weights associated with this strategy")


class RSI(Strategy):
    """Relative Strength Index (RSI) trading strategy implementation.
    
    Implements a strategy based on RSI signals with multiple signal generation methods:
    - Traditional overbought/oversold crossovers
    - Price/RSI divergence
    - Hidden divergence
    - Mean reversion

    Supports signal combination through weighted voting or consensus mechanisms.

    Attributes:
        asset (Asset): Asset to apply the strategy to
        ub (float): Upper bound for overbought condition
        lb (float): Lower bound for oversold condition
        window (int): RSI calculation period
        exit (str): Exit signal type ('re' for mean reversion or other custom types)
        m_rev (bool): Whether to use mean reversion signals
        m_rev_bound (float): Mean reversion boundary level
        signal_type (list[str]): List of signal types to use
        combine (str): Signal combination method ('weighted' or 'consensus')
        weights (np.ndarray): Weights for combining different signal types
        vote_threshold (float): Threshold for signal voting
        engine (TAEngine): Technical analysis calculation engine
        params (str): String representation of strategy parameters (ub/lb)
        daily (pd.DataFrame): Daily data with signals and strategy returns
        five_min (pd.DataFrame): 5-minute data with signals and strategy returns
    """

    def __init__(self, asset: Asset, ub: float = 70, lb: float = 30, window: int = 14,
                 exit: str = 're', m_rev: bool = True, m_rev_bound: float = 50,
                 signal_type: Optional[list[str]] = None, combine: str = 'weighted',
                 weights: Optional[np.ndarray] = None, vote_threshold: float = 0.5):
        """Initialize the RSI strategy.

        Args:
            asset (Asset): Asset to apply the strategy to
            ub (float, optional): Upper bound for overbought. Defaults to 70.
            lb (float, optional): Lower bound for oversold. Defaults to 30.
            window (int, optional): RSI calculation period. Defaults to 14.
            exit (str, optional): Exit signal type. Defaults to 're' (mean reversion).
            m_rev (bool, optional): Use mean reversion signals. Defaults to True.
            m_rev_bound (float, optional): Mean reversion level. Defaults to 50.
            signal_type (list[str], optional): Signal types to use. Defaults to
                ['crossover', 'divergence', 'hidden divergence'].
            combine (str, optional): Signal combination method. Defaults to 'weighted'.
            weights (np.ndarray, optional): Signal weights. Defaults to equal weights.
            vote_threshold (float, optional): Voting threshold. Defaults to 0.5.
        """
        super().__init__(asset)
        self.__ub = ub
        self.__lb = lb
        self.__window = window
        self.__exit = exit
        self.__m_rev = m_rev
        self.__m_rev_bound = m_rev_bound

        if signal_type is not None:
            self.signal_type = list(signal_type)
        else:
            self.signal_type = ['crossover', 'divergence', 'hidden divergence']

        self.__combine = str(combine)

        if weights is not None:
            self.__weights = np.array(weights)
        else:
            self.__weights = np.array([1 / len(self.signal_type)] * len(self.signal_type))
        self.__weights /= np.sum(self.__weights)

        self.__vote_threshold = vote_threshold
        self.engine = TAEngine()
        self.__get_data()

    def __str__(self) -> str:
        """String representation of the strategy.

        Returns:
            str: Strategy description with parameters
        """
        return f'RSI({self.asset.ticker}, ub={self.ub}, lb={self.lb}, window={self.window}, exit={self.exit}, m_rev={self.m_rev}, m_rev_bound={self.m_rev_bound})'

    def __get_data(self) -> None:
        """Calculate RSI and generate trading signals.
        
        Updates both daily and 5-minute dataframes with:
        - RSI values
        - Combined trading signals from multiple signal types
        - Strategy returns (signal * returns)
        """
        self.daily = pd.DataFrame(self.asset.daily[['open', 'high', 'low', 'close', 'adj_close', 'log_rets']].copy())
        self.five_min = pd.DataFrame(self.asset.five_minute[['open', 'high', 'low', 'close', 'adj_close', 'log_rets']].copy())

        self.params = f'({self.ub}/{self.lb})'

        for i, df in enumerate([self.daily, self.five_min]):
            data = df['adj_close']
            name = 'daily' if i == 0 else 'five_min'

            df['rsi'] = self.engine.calculate_rsi(data, self.window, name)
            df.dropna(inplace=True)

            df['signal'] = sg.rsi(df['rsi'], df['adj_close'], self.ub, self.lb, 
                                self.exit, self.signal_type, self.combine, 
                                self.vote_threshold, self.weights, 
                                self.m_rev_bound if self.m_rev else None)

            df.rename(columns=dict(log_rets='returns'), inplace=True)
            df['strategy'] = df['returns'] * df['signal']

            if i == 0:
                self.daily = df
            else:
                self.five_min = df

    # Property getters and setters for strategy parameters
    # Each property includes validation and triggers data recalculation

    @property
    def ub(self):
        return self.__ub

    @ub.setter
    def ub(self, value):
        self.__ub = value
        self.__get_data()

    @property
    def lb(self):
        return self.__lb

    @lb.setter
    def lb(self, value):
        self.__lb = value
        self.__get_data()

    @property
    def m_rev(self):
        return self.__m_rev

    @m_rev.setter
    def m_rev(self, value):
        self.__m_rev = value
        self.__get_data()

    @property
    def exit(self):
        return self.__exit

    @exit.setter
    def exit(self, value):
        self.__exit = value
        self.__get_data()

    @property
    def window(self):
        return self.__window

    @window.setter
    def window(self, value):
        self.__window = value
        self.__get_data()

    @property
    def m_rev_bound(self):
        return self.__m_rev_bound

    @m_rev_bound.setter
    def m_rev_bound(self, value):
        self.__m_rev_bound = value
        self.__get_data()

    @property
    def combine(self):
        return self.__combine

    @combine.setter
    def combine(self, value):
        self.__combine = value
        self.__get_data()

    @property
    def weights(self):
        return self.__weights

    @weights.setter
    def weights(self, value):
        self.__weights = np.array(value)
        self.__weights /= np.sum(self.__weights)
        self.__get_data()

    @property
    def vote_threshold(self):
        return self.__vote_threshold

    @vote_threshold.setter
    def vote_threshold(self, value):
        self.__vote_threshold = value
        self.__get_data()

    def change_params(self, ub: Optional[float] = None, lb: Optional[float] = None,
                     window: Optional[int] = None, exit: Optional[str] = None,
                     m_rev: Optional[bool] = None, m_rev_bound: Optional[float] = None,
                     combine: Optional[str] = None, weights: Optional[np.ndarray] = None,
                     vote_threshold: Optional[float] = None) -> None:
        """Update multiple strategy parameters at once.

        Args:
            ub (float, optional): New upper bound. Defaults to None.
            lb (float, optional): New lower bound. Defaults to None.
            window (int, optional): New RSI period. Defaults to None.
            exit (str, optional): New exit type. Defaults to None.
            m_rev (bool, optional): Use mean reversion. Defaults to None.
            m_rev_bound (float, optional): New mean reversion level. Defaults to None.
            combine (str, optional): New combination method. Defaults to None.
            weights (np.ndarray, optional): New signal weights. Defaults to None.
            vote_threshold (float, optional): New voting threshold. Defaults to None.
        """
        self.__ub = ub if ub is not None else self.ub
        self.__lb = lb if lb is not None else self.lb
        self.__window = window if window is not None else self.window
        self.__exit = exit if exit is not None else self.exit
        self.__m_rev = m_rev if m_rev is not None else self.m_rev
        self.__m_rev_bound = m_rev_bound if m_rev_bound is not None else self.m_rev_bound
        self.__weights = np.array(weights) if weights is not None else self.weights
        self.__weights /= np.sum(self.__weights)
        self.__vote_threshold = vote_threshold if vote_threshold is not None else self.vote_threshold
        self.__get_data()

    def plot(self, timeframe: str = '1d', start_date: Optional[DateLike] = None,
            end_date: Optional[DateLike] = None, candlestick: bool = True,
            show_signal: bool = True) -> go.Figure:
        """Create interactive plot of RSI and price with signals.

        Creates a two-panel plot with:
        - Top panel: Price (candlestick or line) with signals
        - Bottom panel: RSI with overbought/oversold levels

        Args:
            timeframe (str, optional): Data frequency to plot ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date to plot from. Defaults to None.
            end_date (DateLike, optional): End date to plot to. Defaults to None.
            candlestick (bool, optional): Use candlestick chart. Defaults to True.
            show_signal (bool, optional): Show trading signals. Defaults to True.

        Returns:
            go.Figure: Plotly figure with RSI, price, and signals
        """
        df = self.daily.copy() if timeframe == '1d' else self.five_min.copy()

        if start_date is not None:
            df = df[df.index >= start_date]
        if end_date is not None:
            df = df[df.index <= end_date]

        df.dropna(inplace=True)
        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        fig = make_subplots(rows=2, cols=1, 
                        shared_xaxes=True, 
                        vertical_spacing=0.03, 
                        row_heights=[0.7, 0.3],
                        specs=[[{"secondary_y": True}],
                        [{"secondary_y": False}]])

        if candlestick:
            price = go.Candlestick(
                        x=df.index.strftime(format),
                        open=df['open'],
                        high=df['high'],
                        low=df['low'],
                        close=df['close'],
                        name=f'{self.asset.ticker} OHLC',
            )
        else:
            price = go.Scatter(
                        x=df.index.strftime(format),
                        y=df['adj_close'],
                        line=dict(
                            color='#2962FF',
                            width=2,
                            dash='solid'
                        ),
                        name=f'{self.asset.ticker} Price',
            )

        RSI = go.Scatter(
                x=df.index.strftime(format),
                y=df['rsi'],
                line=dict(color='blue', width=1.5),
                name='RSI'
        )

        if show_signal:
            signal = go.Scatter(
                        x=df.index.strftime(format),
                        y=df['signal'],
                        line=dict(color='green', width=0.8, dash='solid'),
                        name='Buy/Sell signal',
                        yaxis='y2'
            )

        fig.add_trace(price)

        fig.add_trace(RSI, row=2, col=1)
        fig.add_hline(y=self.ub, row=2, col=1)
        fig.add_hline(y=self.lb, row=2, col=1)

        if show_signal:
            fig.add_trace(signal)

        layout = {}

        layout['title'] = dict(
                text=f'{self.asset.ticker} RSI Strategy {self.params}',
                x=0.5,
                y=0.95
            )

        layout['xaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=None,
                type='category',
                categoryorder='category ascending',
                nticks=5
            )

        layout['xaxis2'] = dict(
            type='category',
            categoryorder='category ascending',
            nticks=5
        )

        layout['yaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=f'Price ({self.asset.currency})',
            )

        layout[f'xaxis1_rangeslider_visible'] = False

        layout['height'] = 800

        if show_signal:
            layout['yaxis2'] = dict(
                    title='Signal',
                    overlaying='y',
                    side='right',
                    range=[-1.1, 1.1],  # Give some padding to the 0/1 signal
                    tickmode='array',
                    tickvals=[-1, 1],
                    ticktext=['Sell', 'Buy']
                )

        layout['yaxis3'] = dict(
                title='RSI',
                side='right'
            )

        layout['legend'] = dict(
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
                orientation="h",  # horizontal layout
                bgcolor='rgba(255,255,255,0.8)'
            )

        fig.update_layout(**layout,
                            paper_bgcolor='white',
                            plot_bgcolor='rgba(240,240,240,0.95)',
                            hovermode='x unified')

        fig.show()

        return fig

    @classmethod
    def _backtest_wrapper(cls, strategy_params: dict, ub: float, lb: float, window: int,
                         m_rev_bound: float, timeframe: str, start_date: Optional[DateLike], 
                         end_date: Optional[DateLike]) -> tuple:
        """Helper function to perform backtesting for a single parameter combination.

        Args:
            strategy_params: Dictionary of parameters needed to initialize the strategy
            ub: upper bound for overbought
            lb: lower bound for oversold
            window: lookback window
            m_rev_bound: rsi bound for mean reversion
            signal: Signal line period
            timeframe: Data frequency to use
            start_date: Start date for backtest
            end_date: End date for backtest

        Returns:
            tuple: (fast, slow, signal, hold_returns, strategy_returns)
        """
        # Create a fresh strategy instance for each test
        strategy_params['ub'] = ub
        strategy_params['lb'] = lb
        strategy_params['window'] = window
        strategy_params['m_rev_bound'] = m_rev_bound

        strategy = cls(**strategy_params)
        backtest_results = strategy.backtest(plot=False, 
                                           timeframe=timeframe, 
                                           start_date=start_date,
                                           end_date=end_date)
        del strategy
        return ub, lb, window, m_rev_bound, backtest_results['returns'], backtest_results['strategy']

    def optimize(self, inplace: bool = False, timeframe: str = '1d',
                start_date: Optional[DateLike] = None, 
                end_date: Optional[DateLike] = None,
                ub_range: Optional[np.ndarray] = None,
                lb_range: Optional[np.ndarray] = None,
                window_range: Optional[np.ndarray] = None,
                m_rev_bound_range: Optional[np.ndarray] = None) -> pd.DataFrame:
        """Optimize RSI parameters through grid search.

        Tests combinations of parameters to find the best performing settings
        based on strategy returns vs buy-and-hold returns.

        Args:
            inplace (bool, optional): Update strategy parameters. Defaults to False.
            timeframe (str, optional): Data frequency to use ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date for optimization. Defaults to None.
            end_date (DateLike, optional): End date for optimization. Defaults to None.
            ub_range (np.ndarray, optional): Upper bounds to test. Defaults to [60-80, step=5].
            lb_range (np.ndarray, optional): Lower bounds to test. Defaults to [20-40, step=5].
            window_range (np.ndarray, optional): Windows to test. Defaults to [10-30, step=5].
            m_rev_bound_range (np.ndarray, optional): Mean reversion levels. Defaults to [40-60, step=5].

        Returns:
            pd.DataFrame: Results sorted by net returns (strategy - hold), containing:
                - ub: Upper bound
                - lb: Lower bound
                - window: RSI period
                - m_rev_bound: Mean reversion level
                - hold_returns: Buy-and-hold returns
                - strategy_returns: Strategy returns
                - net: Net returns (strategy - hold)
        """
        if ub_range is None:
            ub_range = np.arange(60, 81, 5)
        if lb_range is None:
            lb_range = np.arange(20, 41, 5)
        if window_range is None:
            window_range = np.arange(10, 31, 5)

        params = [ub_range, lb_range, window_range]

        if self.m_rev:
            if m_rev_bound_range is None:
                m_rev_bound_range = np.arange(40, 61, 5)
            params.append(m_rev_bound_range)
        else:
            params.append([self.m_rev_bound])

        old_params = {'ub': self.ub, 'lb': self.lb, 'window': self.window,
                      'm_rev_bound': self.m_rev_bound}
        strategy_params = self._get_init_params()

        params = list(product(*params))
        params = [(ub, lb, window, m_rev_bound) for ub, lb, window, m_rev_bound in params if ub > lb and
                  m_rev_bound < ub and m_rev_bound > lb]

        args = [(strategy_params, ub, lb, window, m_rev_bound, timeframe, start_date, end_date)
                for ub, lb, window, m_rev_bound in params]

        with mp.Pool(mp.cpu_count()) as pool:
            results = pool.starmap(self._backtest_wrapper, args)

        results = pd.DataFrame(results, columns=['ub', 'lb', 'window', 'm_rev_bound', 'hold_returns', 'strategy_returns'])
        results['net'] = results['strategy_returns'] - results['hold_returns']
        results = results.sort_values(by='net', ascending=False)

        opt_ub = results.iloc[0]['ub']
        opt_lb = results.iloc[0]['lb']
        opt_window = results.iloc[0]['window']
        opt_m_rev_bound = results.iloc[0]['m_rev_bound']

        if inplace:
            self.change_params(ub=opt_ub, lb=opt_lb, window=opt_window, m_rev_bound=opt_m_rev_bound)
        else:
            self.change_params(**old_params)

        return results

    def _get_init_params(self) -> dict:
        """Return the parameters needed to initialize a new instance of the strategy.

        Returns:
            dict: dict of parameters to instantiate a similar instance
        """
        return {
            'asset': self.asset,
            'exit': self.exit,
            'm_rev': self.m_rev,
            'signal_type': self.signal_type,
            'combine': self.combine,
            'weights': self.weights,
            'vote_threshold': self.vote_threshold
        }


class MACD(Strategy):
    """Moving Average Convergence Divergence (MACD) trading strategy implementation.
    
    Implements a strategy based on MACD signals with multiple signal generation methods:
    - Traditional signal line crossovers
    - Price/MACD divergence
    - Hidden divergence patterns
    - MACD histogram momentum
    - Double peak/trough patterns

    Supports signal combination through weighted voting or consensus mechanisms.

    Attributes:
        asset (Asset): Asset to apply the strategy to
        fast (int): Fast EMA period for MACD line
        slow (int): Slow EMA period for MACD line
        signal (int): Signal line EMA period
        signal_type (list[str]): Active signal generation methods
        combine (str): Signal combination method ('weighted' or 'consensus')
        weights (np.ndarray): Weights for each signal type
        vote_threshold (float): Threshold for signal voting
        engine (TAEngine): Technical analysis calculation engine
        params (str): String representation of strategy parameters (fast/slow/signal)
    """

    def __init__(self, asset: Asset, fast: int = 12, slow: int = 26, signal: int = 9,
                 signal_type: Optional[list[str]] = None, combine: str = 'weighted',
                 weights: Optional[np.ndarray] = None, vote_threshold: float = 0.5):
        """Initialize the MACD strategy.

        Args:
            asset (Asset): Asset to apply the strategy to
            fast (int, optional): Fast EMA period. Defaults to 12.
            slow (int, optional): Slow EMA period. Defaults to 26.
            signal (int, optional): Signal line EMA period. Defaults to 9.
            signal_type (list[str], optional): Signal types to use. Defaults to
                ['crossover', 'divergence', 'hidden divergence', 'momentum', 'double peak/trough'].
            combine (str, optional): Signal combination method. Defaults to 'weighted'.
            weights (np.ndarray, optional): Signal weights. Defaults to equal weights.
            vote_threshold (float, optional): Voting threshold. Defaults to 0.5.
        """
        super().__init__(asset)
        self.__slow = slow
        self.__fast = fast
        self.__signal = signal

        if signal_type is not None:
            self.signal_type = list(signal_type)
        else:
            self.signal_type = ['crossover', 'divergence', 'hidden divergence', 
                              'momentum', 'double peak/trough']

        self.__combine = str(combine)

        if weights is not None:
            self.__weights = np.array(weights)
        else:
            self.__weights = np.array([1 / len(self.signal_type)] * len(self.signal_type))
        self.__weights /= np.sum(self.__weights)

        self.__vote_threshold = vote_threshold
        self.engine = TAEngine()
        self.__get_data()

    def __get_data(self) -> None:
        """Calculate MACD components and generate trading signals.
        
        Updates both daily and 5-minute dataframes with:
        - MACD line (fast EMA - slow EMA)
        - Signal line (EMA of MACD line)
        - MACD histogram
        - Combined trading signals from multiple signal types
        - Strategy returns (signal * returns)
        """
        self.daily = pd.DataFrame(self.asset.daily[['open', 'high', 'low', 'close', 'adj_close', 'log_rets']].copy())
        self.five_min = pd.DataFrame(self.asset.five_minute[['open', 'high', 'low', 'close', 'adj_close', 'log_rets']].copy())

        self.params = f'({self.fast}/{self.slow}/{self.signal})'

        for i, df in enumerate([self.daily, self.five_min]):
            data = df['adj_close']
            name = 'daily' if i == 0 else 'five_min'

            df[['macd', 'signal_line', 'macd_hist']] = self.engine.calculate_macd(
                data, [self.fast, self.slow, self.signal], name)
            df.dropna(inplace=True)

            df['signal'] = sg.macd(df['macd_hist'], df['macd'], df['adj_close'],
                                 self.signal_type, self.combine, self.vote_threshold, 
                                 self.weights)

            df.rename(columns=dict(log_rets='returns'), inplace=True)
            df['strategy'] = df['returns'] * df['signal']

            if i == 0:
                self.daily = df
            else:
                self.five_min = df

    @property
    def fast(self):
        return self.__fast

    @fast.setter
    def fast(self, value):
        self.__fast = value
        self.__get_data()

    @property
    def slow(self):
        return self.__slow

    @slow.setter
    def slow(self, value):
        self.__slow= value
        self.__get_data()

    @property
    def signal(self):
        return self.__signal

    @signal.setter
    def signal(self, value):
        self.__signal = value
        self.__get_data()

    @property
    def combine(self):
        return self.__combine

    @combine.setter
    def combine(self, value):
        self.__combine = value
        self.__get_data()

    @property
    def weights(self):
        return self.__weights

    @weights.setter
    def weights(self, value):
        self.__weights = np.array(value)
        self.__weights /= np.sum(self.__weights)
        self.__get_data()

    @property
    def vote_threshold(self):
        return self.__vote_threshold

    @vote_threshold.setter
    def vote_threshold(self, value):
        self.__vote_threshold = value
        self.__get_data()

    def change_params(self, fast: Optional[int] = None, slow: Optional[int] = None,
                     signal: Optional[int] = None, combine: Optional[str] = None,
                     weights: Optional[np.ndarray] = None, 
                     vote_threshold: Optional[float] = None) -> None:
        """Update multiple strategy parameters at once.

        Args:
            fast (int, optional): New fast period. Defaults to None.
            slow (int, optional): New slow period. Defaults to None.
            signal (int, optional): New signal period. Defaults to None.
            combine (str, optional): New combination method. Defaults to None.
            weights (np.ndarray, optional): New signal weights. Defaults to None.
            vote_threshold (float, optional): New voting threshold. Defaults to None.
        """
        self.__fast = fast if fast is not None else self.fast
        self.__slow = slow if slow is not None else self.slow
        self.__signal = signal if signal is not None else self.signal
        self.__combine = combine if combine is not None else self.combine
        self.__weights = np.array(weights) if weights is not None else self.weights
        self.__weights /= np.sum(self.__weights)
        self.__vote_threshold = vote_threshold if vote_threshold is not None else self.vote_threshold
        self.__get_data()

    def plot(self, timeframe: str = '1d', start_date: Optional[DateLike] = None,
            end_date: Optional[DateLike] = None, candlestick: bool = True,
            show_signal: bool = True) -> go.Figure:
        """Create interactive plot of MACD components and price with signals.

        Creates a two-panel plot with:
        - Top panel: Price (candlestick or line) with signals
        - Bottom panel: MACD line, signal line, and histogram

        Args:
            timeframe (str, optional): Data frequency to plot ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date to plot from. Defaults to None.
            end_date (DateLike, optional): End date to plot to. Defaults to None.
            candlestick (bool, optional): Use candlestick chart. Defaults to True.
            show_signal (bool, optional): Show trading signals. Defaults to True.

        Returns:
            go.Figure: Plotly figure with MACD components, price, and signals
        """
        df = self.daily.copy() if timeframe == '1d' else self.five_min.copy()

        if start_date is not None:
            df = df[df.index >= start_date]
        if end_date is not None:
            df = df[df.index <= end_date]

        df.dropna(inplace=True)
        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        fig = make_subplots(rows=2, cols=1, 
                        shared_xaxes=True, 
                        vertical_spacing=0.03, 
                        row_heights=[0.7, 0.3],
                        specs=[[{"secondary_y": True}],
                        [{"secondary_y": False}]])

        if candlestick:
            price = go.Candlestick(
                        x=df.index.strftime(format),
                        open=df['open'],
                        high=df['high'],
                        low=df['low'],
                        close=df['close'],
                        name=f'{self.asset.ticker} OHLC',
            )
        else:
            price = go.Scatter(
                        x=df.index.strftime(format),
                        y=df['adj_close'],
                        line=dict(
                            color='#2962FF',
                            width=2,
                            dash='solid'
                        ),
                        name=f'{self.asset.ticker} Price',
            )

        MACD = go.Scatter(
                x=df.index.strftime(format),
                y=df['macd'],
                line=dict(color='red', width=1.5),
                name='MACD'
        )

        signal_line = go.Scatter(
                x=df.index.strftime(format),
                y=df['signal_line'],
                line=dict(color='blue', width=1.5),
                name='Signal Line'
        )

        macd_hist = go.Bar(
                x=df.index.strftime(format),
                y=df['macd_hist'],
                marker_color='black',
                name='MACD Histogram'
        )

        if show_signal:
            signal = go.Scatter(
                        x=df.index.strftime(format),
                        y=df['signal'],
                        line=dict(color='green', width=0.8, dash='solid'),
                        name='Buy/Sell signal',
                        yaxis='y2'
            )

        fig.add_trace(price)

        fig.add_trace(MACD, row=2, col=1)
        fig.add_trace(signal_line, row=2, col=1)
        fig.add_trace(macd_hist, row=2, col=1)



        if show_signal:
            fig.add_trace(signal)

        layout = {}

        layout['title'] = dict(
                text=f'{self.asset.ticker} MACD Strategy {self.params}',
                x=0.5,
                y=0.95
            )

        layout['xaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=None,
                type='category',
                categoryorder='category ascending',
                nticks=5
            )

        layout['xaxis2'] = dict(
            type='category',
            categoryorder='category ascending',
            nticks=5
        )

        layout['yaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=f'Price ({self.asset.currency})',
            )

        layout[f'xaxis1_rangeslider_visible'] = False

        layout['height'] = 800

        if show_signal:
            layout['yaxis2'] = dict(
                    title='Signal',
                    overlaying='y',
                    side='right',
                    range=[-1.1, 1.1],  # Give some padding to the 0/1 signal
                    tickmode='array',
                    tickvals=[-1, 1],
                    ticktext=['Sell', 'Buy']
                )

        layout['yaxis3'] = dict(
                title='MACD',
                side='right'
            )

        layout['legend'] = dict(
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
                orientation="h",  # horizontal layout
                bgcolor='rgba(255,255,255,0.8)'
            )

        fig.update_layout(**layout,
                            paper_bgcolor='white',
                            plot_bgcolor='rgba(240,240,240,0.95)',
                            hovermode='x unified')

        fig.show()

        return fig

    @classmethod
    def _backtest_wrapper(cls, strategy_params: dict, fast: int, slow: int, signal: int, 
                         timeframe: str, start_date: Optional[DateLike], 
                         end_date: Optional[DateLike]) -> tuple:
        """Helper function to perform backtesting for a single parameter combination.

        Args:
            strategy_params: Dictionary of parameters needed to initialize the strategy
            fast: Fast EMA period
            slow: Slow EMA period
            signal: Signal line period
            timeframe: Data frequency to use
            start_date: Start date for backtest
            end_date: End date for backtest

        Returns:
            tuple: (fast, slow, signal, hold_returns, strategy_returns)
        """
        # Create a fresh strategy instance for each test
        strategy_params['fast'] = fast
        strategy_params['slow'] = slow
        strategy_params['signal'] = signal

        strategy = cls(**strategy_params)
        backtest_results = strategy.backtest(plot=False, 
                                           timeframe=timeframe, 
                                           start_date=start_date,
                                           end_date=end_date)
        del strategy
        return fast, slow, signal, backtest_results['returns'], backtest_results['strategy']

    def optimize(self, inplace: bool = False, timeframe: str = '1d',
                start_date: Optional[DateLike] = None, 
                end_date: Optional[DateLike] = None,
                slow_range: Optional[np.ndarray] = None,
                fast_range: Optional[np.ndarray] = None,
                signal_range: Optional[np.ndarray] = None) -> pd.DataFrame:
        """Optimize MACD parameters through grid search.

        Tests combinations of parameters to find the best performing settings
        based on strategy returns vs buy-and-hold returns.

        Args:
            inplace (bool, optional): Update strategy parameters. Defaults to False.
            timeframe (str, optional): Data frequency to use ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date for optimization. Defaults to None.
            end_date (DateLike, optional): End date for optimization. Defaults to None.
            fast_range (np.ndarray, optional): Fast periods to test. Defaults to [8-20, step=2].
            slow_range (np.ndarray, optional): Slow periods to test. Defaults to [21-35, step=2].
            signal_range (np.ndarray, optional): Signal periods to test. Defaults to [5-15, step=2].

        Returns:
            pd.DataFrame: Results sorted by net returns (strategy - hold), containing:
                - fast: Fast EMA period
                - slow: Slow EMA period
                - signal: Signal line period
                - hold_returns: Buy-and-hold returns
                - strategy_returns: Strategy returns
                - net: Net returns (strategy - hold)
        """
        if fast_range is None:
            fast_range = np.arange(8, 21, 2)
        if slow_range is None:
            slow_range = np.arange(21, 35, 2)
        if signal_range is None:
            signal_range = np.arange(5, 15, 2)

        old_params = {'fast': self.fast, 'slow': self.slow, 'signal': self.signal}
        strategy_params = self._get_init_params()

        params = list(product(fast_range, slow_range, signal_range))
        params = [(fast, slow, signal) for fast, slow, signal in params if fast < slow]

        args = [(strategy_params, fast, slow, signal, timeframe, start_date, end_date)
                for fast, slow, signal in params]

        with mp.Pool(mp.cpu_count()) as pool:
            results = pool.starmap(self._backtest_wrapper, args)

        results = pd.DataFrame(results, columns=['fast', 'slow', 'signal', 'hold_returns', 'strategy_returns'])
        results['net'] = results['strategy_returns'] - results['hold_returns']
        results = results.sort_values(by='net', ascending=False)

        opt_fast = results.iloc[0]['fast']
        opt_slow = results.iloc[0]['slow']
        opt_signal = results.iloc[0]['signal']

        if inplace:
            self.change_params(fast=opt_fast, slow=opt_slow, signal=opt_signal)
        else:
            self.change_params(**old_params)

        return results

    def _get_init_params(self) -> dict:
        """Return the parameters needed to initialize a new instance of the strategy.

        Returns:
            dict: dict of parameters to instantiate a similar instance
        """
        return {
            'asset': self.asset,
            'signal_type': self.signal_type,
            'combine': self.combine,
            'weights': self.weights,
            'vote_threshold': self.vote_threshold
        }


class BB(Strategy):
    """Bollinger Bands trading strategy implementation.
    
    Implements a strategy based on Bollinger Bands with multiple signal generation methods:
    - Band bounces (price reversal at bands)
    - Double bounces (multiple tests of bands)
    - Band walks (price riding along bands)
    - Band squeeze (volatility contraction)
    - Band breakouts (price breaking outside bands)
    - %B indicator (normalized position within bands)

    Supports signal combination through weighted voting or consensus mechanisms.

    Attributes:
        asset (Asset): Asset to apply the strategy to
        window (int): Period for moving average and standard deviation
        num_std (float): Number of standard deviations for band width
        signal_type (list[str]): Active signal generation methods
        combine (str): Signal combination method ('weighted' or 'consensus')
        weights (np.ndarray): Weights for each signal type
        vote_threshold (float): Threshold for signal voting
        engine (TAEngine): Technical analysis calculation engine
        params (str): String representation of strategy parameters (window±std)
    """

    def __init__(self, asset: Asset, window: int = 20, num_std: float = 2,
                 signal_type: Optional[list[str]] = None, combine: str = 'weighted',
                 weights: Optional[np.ndarray] = None, vote_threshold: float = 0.5):
        """Initialize the Bollinger Bands strategy.

        Args:
            asset (Asset): Asset to apply the strategy to
            window (int, optional): MA and std dev period. Defaults to 20.
            num_std (float, optional): Band width in standard deviations. Defaults to 2.
            signal_type (list[str], optional): Signal types to use. Defaults to
                ['bounce', 'double', 'walks', 'squeeze', 'breakout', '%B'].
            combine (str, optional): Signal combination method. Defaults to 'weighted'.
            weights (np.ndarray, optional): Signal weights. Defaults to equal weights.
            vote_threshold (float, optional): Voting threshold. Defaults to 0.5.
        """
        super().__init__(asset)
        self.__window = window
        self.__num_std = num_std

        if signal_type is not None:
            self.signal_type = list(signal_type)
        else:
            self.signal_type = ['bounce', 'double', 'walks', 'squeeze', 'breakout', '%B']

        self.__combine = str(combine)

        if weights is not None:
            self.__weights = np.array(weights)
        else:
            self.__weights = np.array([1 / len(self.signal_type)] * len(self.signal_type))
        self.__weights /= np.sum(self.__weights)

        self.__vote_threshold = vote_threshold
        self.engine = TAEngine()
        self.__get_data()

    def __get_data(self) -> None:
        """Calculate Bollinger Bands components and generate trading signals.
        
        Updates both daily and 5-minute dataframes with:
        - Simple moving average (middle band)
        - Upper and lower Bollinger Bands
        - Combined trading signals from multiple signal types
        - Strategy returns (signal * returns)
        """
        self.daily = pd.DataFrame(self.asset.daily[['open', 'high', 'low', 'close', 'adj_close', 'log_rets']].copy())
        self.five_min = pd.DataFrame(self.asset.five_minute[['open', 'high', 'low', 'close', 'adj_close', 'log_rets']].copy())
        self.params = f'window={self.window}(±{self.num_std})'

        for i, df in enumerate([self.daily, self.five_min]):
            data = df['adj_close']
            name = 'daily' if i == 0 else 'five_min'

            df[['sma', 'bol_up', 'bol_down']] = self.engine.calculate_bb(
                data, self.window, self.num_std, name)
            df.dropna(inplace=True)

            df['signal'] = sg.bb(df['adj_close'], df['bol_up'], df['bol_down'],
                               self.signal_type, self.combine, self.vote_threshold, 
                               self.weights)
            df.rename(columns=dict(log_rets='returns'), inplace=True)
            df['strategy'] = df['returns'] * df['signal']

            if i == 0:
                self.daily = df
            else:
                self.five_min = df

    @property
    def window(self):
        return self.__window

    @window.setter
    def window(self, value):
        self.__window = value
        self.__get_data()

    @property
    def num_std(self):
        return self.__num_std

    @num_std.setter
    def num_std(self, value):
        self.__num_std = value
        self.__get_data()

    @property
    def combine(self):
        return self.__combine

    @combine.setter
    def combine(self, value):
        self.__combine = value
        self.__get_data()

    @property
    def weights(self):
        return self.__weights

    @weights.setter
    def weights(self, value):
        self.__weights = np.array(value)
        self.__weights /= np.sum(self.__weights)
        self.__get_data()

    @property
    def vote_threshold(self):
        return self.__vote_threshold

    @vote_threshold.setter
    def vote_threshold(self, value):
        self.__vote_threshold = value
        self.__get_data()

    def change_params(self, window: Optional[int] = None, num_std: Optional[float] = None,
                     combine: Optional[str] = None, weights: Optional[np.ndarray] = None,
                     vote_threshold: Optional[float] = None) -> None:
        """Update multiple strategy parameters at once.

        Args:
            window (int, optional): New window period. Defaults to None.
            num_std (float, optional): New std dev multiplier. Defaults to None.
            combine (str, optional): New combination method. Defaults to None.
            weights (np.ndarray, optional): New signal weights. Defaults to None.
            vote_threshold (float, optional): New voting threshold. Defaults to None.
        """
        self.__window = window if window is not None else self.window
        self.__num_std = num_std if num_std is not None else self.num_std
        self.__combine = combine if combine is not None else self.combine
        self.__weights = np.array(weights) if weights is not None else self.weights
        self.__weights /= np.sum(self.__weights)
        self.__vote_threshold = vote_threshold if vote_threshold is not None else self.vote_threshold
        self.__get_data()

    def plot(self, timeframe: str = '1d', start_date: Optional[DateLike] = None,
            end_date: Optional[DateLike] = None, candlestick: bool = True,
            show_signal: bool = True) -> go.Figure:
        """Create interactive plot of Bollinger Bands and signals.

        Creates a plot showing:
        - Price (candlestick or line)
        - Middle band (SMA)
        - Upper and lower Bollinger Bands with shaded area
        - Trading signals if requested

        Args:
            timeframe (str, optional): Data frequency to plot ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date to plot from. Defaults to None.
            end_date (DateLike, optional): End date to plot to. Defaults to None.
            candlestick (bool, optional): Use candlestick chart. Defaults to True.
            show_signal (bool, optional): Show trading signals. Defaults to True.

        Returns:
            go.Figure: Plotly figure with Bollinger Bands, price, and signals
        """
        df = self.daily.copy() if timeframe == '1d' else self.five_min.copy()

        if start_date is not None:
            df = df[df.index >= start_date]
        if end_date is not None:
            df = df[df.index <= end_date]

        df.dropna(inplace=True)
        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        fig = go.Figure()

        traces = []

        if candlestick:
            price = go.Candlestick(
                        x=df.index.strftime(format),
                        open=df['open'],
                        high=df['high'],
                        low=df['low'],
                        close=df['close'],
                        name=f'{self.asset.ticker} OHLC',
            )

            sma = go.Scatter(
                        x=df.index.strftime(format),
                        y=df['sma'],
                        line=dict(
                            color='#2962FF',
                            width=2,
                            dash='solid'
                        ),
                        name=f'{self.asset.ticker} SMA',
            )

            traces.extend([price, sma])
        else:
            price = go.Scatter(
                        x=df.index.strftime(format),
                        y=df['adj_close'],
                        line=dict(
                            color='#2962FF',
                            width=2,
                            dash='solid'
                        ),
                        name=f'{self.asset.ticker} Price',
            )

            traces.append(price)

        bol_down = go.Scatter(
            x=df.index.strftime(format),
            y=df['bol_down'],
            line=dict(color='#FF4081', width=1, dash='dash'),
            showlegend=False,
            name='lower band'
        )

        bol_up = go.Scatter(
            x=df.index.strftime(format),
            y=df['bol_up'],
            fill='tonexty',
            line=dict(color='#FF4081', width=1, dash='dash'),
            fillcolor='rgba(68, 68, 255, 0.1)',
            showlegend=False,
            name='upper band'
        )

        traces.extend([bol_down, bol_up])

        if show_signal:
            signal = go.Scatter(
                        x=df.index.strftime(format),
                        y=df['signal'],
                        line=dict(color='green', width=0.8, dash='solid'),
                        name='Buy/Sell signal',
                        yaxis='y2'
            )

            traces.append(signal)

        fig.add_traces(traces)

        layout = {}

        layout['title'] = dict(
                text=f'{self.asset.ticker} BB Strategy {self.params}',
                x=0.5,
                y=0.95
            )

        layout['xaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=None,
                type='category',
                categoryorder='category ascending',
                nticks=5
            )

        layout['yaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=f'Price ({self.asset.currency})',
            )

        layout[f'xaxis1_rangeslider_visible'] = False

        layout['height'] = 800

        if show_signal:
            layout['yaxis2'] = dict(
                    title='Signal',
                    overlaying='y',
                    side='right',
                    range=[-1.1, 1.1],
                    tickmode='array',
                    tickvals=[-1, 1],
                    ticktext=['Sell', 'Buy']
                )

        layout['legend'] = dict(
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
                orientation="h",  # horizontal layout
                bgcolor='rgba(255,255,255,0.8)'
            )

        fig.update_layout(**layout,
                            paper_bgcolor='white',
                            plot_bgcolor='rgba(240,240,240,0.95)',
                            hovermode='x unified')

        fig.show()

        return fig

    def optimize(self, inplace: bool = False, timeframe: str = '1d',
                start_date: Optional[DateLike] = None, 
                end_date: Optional[DateLike] = None,
                window_range: Optional[np.ndarray] = None,
                num_std_range: Optional[np.ndarray] = None) -> pd.DataFrame:
        """Optimize Bollinger Bands parameters through grid search.

        Tests combinations of window period and standard deviation multiplier
        to find the best performing settings based on strategy returns vs
        buy-and-hold returns.

        Args:
            inplace (bool, optional): Update strategy parameters. Defaults to False.
            timeframe (str, optional): Data frequency to use ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date for optimization. Defaults to None.
            end_date (DateLike, optional): End date for optimization. Defaults to None.
            window_range (np.ndarray, optional): Windows to test. Defaults to [10-50, step=5].
            num_std_range (np.ndarray, optional): Std dev multipliers. Defaults to [1.5-2.5, step=0.1].

        Returns:
            pd.DataFrame: Results sorted by net returns (strategy - hold), containing:
                - window: MA and std dev period
                - num_std: Band width multiplier
                - hold_returns: Buy-and-hold returns
                - strategy_returns: Strategy returns
                - net: Net returns (strategy - hold)
        """
        if window_range is None:
            window_range = np.arange(10, 51, 5)
        if num_std_range is None:
            num_std_range = np.arange(1.5, 2.6, 0.1)

        old_params = {'window': self.window, 'num_std': self.num_std}

        results = []
        for window, num_std in product(window_range, num_std_range):

            self.change_params(window=window, num_std=num_std)
            backtest_results = self.backtest(plot=False, 
                             timeframe=timeframe, 
                             start_date=start_date,
                             end_date=end_date)
            results.append((window, num_std, backtest_results['returns'], backtest_results['strategy']))

        results = pd.DataFrame(results, columns=['window', 'num_std', 'hold_returns', 'strategy_returns'])
        results['net'] = results['strategy_returns'] - results['hold_returns']
        results = results.sort_values(by='net', ascending=False)

        opt_window = int(results.iloc[0]['window'])
        opt_num_std = results.iloc[0]['num_std']

        if inplace:
            self.change_params(window=opt_window, num_std=opt_num_std)
        else:
            self.change_params(**old_params)

        return results


class CombinedStrategy(Strategy):
    """Meta-strategy that combines multiple technical analysis strategies.
    
    Integrates signals from different strategy types (MA, RSI, MACD, BB)
    into a unified trading strategy. Each component strategy can be individually
    configured and their signals are combined through weighted voting or consensus.

    This meta-strategy allows for:
    - Using multiple technical indicators together
    - Optimizing weights between different strategies
    - Finding consensus among different trading signals
    - Reducing false signals through combined confirmation

    Attributes:
        asset (Asset): Asset to apply the strategy to
        strategies (list[Strategy]): List of component strategies
        combine (str): Signal combination method ('weighted' or 'consensus')
        weights (np.ndarray): Weights for each component strategy
        vote_threshold (float): Threshold for signal voting
        params (str): String representation of strategy parameters (empty for combined)
    """

    def __init__(self, asset: Asset, strategies: Optional[list[Strategy]] = None,
                 combine: str = 'weighted', weights: Optional[np.ndarray] = None,
                 vote_threshold: float = 0.5):
        """Initialize the Combined strategy.

        Args:
            asset (Asset): Asset to apply the strategy to
            strategies (list[Strategy], optional): Component strategies. Defaults to
                [MA_Crossover, RSI, MACD, BB] with default parameters.
            combine (str, optional): Signal combination method. Defaults to 'weighted'.
            weights (np.ndarray, optional): Strategy weights. Defaults to equal weights.
            vote_threshold (float, optional): Voting threshold. Defaults to 0.5.
        """
        super().__init__(asset)

        if strategies is not None:
            for s in strategies:
                if s.asset != asset:
                    raise TypeError("Strategies and asset do not match")
            self.__strategies = strategies
        else:
            self.__strategies = [MA_Crossover(asset), RSI(asset), MACD(asset), BB(asset)]

        if weights is not None:
            self.__weights = np.array(weights)
        else:
            self.__weights = np.array([1 / len(self.__strategies)] * len(self.__strategies))
        self.__weights /= np.sum(self.__weights)

        self.__combine = str(combine)
        self.__vote_threshold = vote_threshold

        self.__get_data()

    def __get_data(self) -> None:
        """Collect signals from all strategies and combine them.
        
        Updates both daily and 5-minute dataframes with:
        - Individual strategy signals
        - Combined trading signal using weights and threshold
        - Strategy returns (signal * returns)
        """
        self.daily = pd.DataFrame(self.asset.daily[['open', 'high', 'low', 'close', 'adj_close', 'log_rets']].copy())
        self.five_min = pd.DataFrame(self.asset.five_minute[['open', 'high', 'low', 'close', 'adj_close', 'log_rets']].copy())
        self.params = ''

        for i, df in enumerate([self.daily, self.five_min]):
            name = 'daily' if i == 0 else 'five_min'
            signals = pd.DataFrame(index=df.index)

            for i, strat in enumerate(self.strategies):
                signals[f'{strat.__class__.__name__}_signal_{i}'] = eval(f"strat.{name}['signal']")

            signals.dropna(inplace=True)
            df['signal'] = sg.vote(signals, self.vote_threshold, self.weights)
            df.dropna(inplace=True)

            df.rename(columns=dict(log_rets='returns'), inplace=True)
            df['strategy'] = df['returns'] * df['signal']
            if i == 0:
                self.daily = df
            else:
                self.five_min = df

    @property
    def strategies(self):
        return self.__strategies

    @strategies.setter
    def strategies(self, value):
        self.__strategies = list(value)
        self.__get_data()

    @property
    def combine(self):
        return self.__combine

    @combine.setter
    def combine(self, value):
        self.__combine = value
        self.__get_data()

    @property
    def weights(self):
        return self.__weights

    @weights.setter
    def weights(self, value):
        self.__weights = np.array(value)
        self.__weights /= np.sum(self.__weights)
        self.__get_data()

    @property
    def vote_threshold(self):
        return self.__vote_threshold

    @vote_threshold.setter
    def vote_threshold(self, value):
        self.__vote_threshold = value
        self.__get_data()

    def change_params(self, strategies: Optional[list[Strategy]] = None,
                     combine: Optional[str] = None,
                     weights: Optional[np.ndarray] = None,
                     vote_threshold: Optional[float] = None) -> None:
        """Update multiple strategy parameters at once.

        Args:
            strategies (list[Strategy], optional): New component strategies. Defaults to None.
            combine (str, optional): New combination method. Defaults to None.
            weights (np.ndarray, optional): New strategy weights. Defaults to None.
            vote_threshold (float, optional): New voting threshold. Defaults to None.
        """
        self.__strategies = list(strategies) if strategies is not None else self.strategies
        self.__combine = combine if combine is not None else self.combine
        self.__weights = np.array(weights) if weights is not None else self.weights
        self.__weights /= np.sum(self.__weights)
        self.__vote_threshold = vote_threshold if vote_threshold is not None else self.vote_threshold
        self.__get_data()

    def plot(self, timeframe: str = '1d', start_date: Optional[DateLike] = None,
            end_date: Optional[DateLike] = None, candlestick: bool = True) -> go.Figure:
        """Create interactive plot of combined strategy signals.

        Creates a plot showing:
        - Price (candlestick or line)
        - Combined trading signals
        
        Note: Individual strategy indicators are not shown to avoid clutter.
        Use the plot() method of individual strategies to see their indicators.

        Args:
            timeframe (str, optional): Data frequency to plot ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date to plot from. Defaults to None.
            end_date (DateLike, optional): End date to plot to. Defaults to None.
            candlestick (bool, optional): Use candlestick chart. Defaults to True.

        Returns:
            go.Figure: Plotly figure with price and combined signals
        """
        df = self.daily.copy() if timeframe == '1d' else self.five_min.copy()

        if start_date is not None:
            df = df[df.index >= start_date]
        if end_date is not None:
            df = df[df.index <= end_date]

        df.dropna(inplace=True)
        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        fig = go.Figure()

        if candlestick:
            price = go.Candlestick(
                        x=df.index.strftime(format),
                        open=df['open'],
                        high=df['high'],
                        low=df['low'],
                        close=df['close'],
                        name=f'{self.asset.ticker} OHLC',
            )
        else:
            price = go.Scatter(
                        x=df.index.strftime(format),
                        y=df['adj_close'],
                        line=dict(
                            color='#2962FF',
                            width=2,
                            dash='solid'
                        ),
                        name=f'{self.asset.ticker} Price',
            )

        signal = go.Scatter(
                    x=df.index.strftime(format),
                    y=df['signal'],
                    line=dict(color='green', width=0.8, dash='solid'),
                    name='Buy/Sell signal',
                    yaxis='y2'
        )

        fig.add_traces([price, signal])

        layout = {}

        layout['title'] = dict(
                text=f'{self.asset.ticker} Combined Strategy {self.params}',
                x=0.5,
                y=0.95
            )

        layout['xaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=None,
                type='category',
                categoryorder='category ascending',
                nticks=5
            )

        layout['yaxis'] = dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=f'Price ({self.asset.currency})',
            )

        layout[f'xaxis1_rangeslider_visible'] = False

        layout['height'] = 800

        layout['yaxis2'] = dict(
                title='Signal',
                overlaying='y',
                side='right',
                range=[-1.1, 1.1],
                tickmode='array',
                tickvals=[-1, 1],
                ticktext=['Sell', 'Buy']
            )

        layout['legend'] = dict(
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
                orientation="h",  # horizontal layout
                bgcolor='rgba(255,255,255,0.8)'
            )

        fig.update_layout(**layout,
                            paper_bgcolor='white',
                            plot_bgcolor='rgba(240,240,240,0.95)',
                            hovermode='x unified')

        fig.show()

        return fig

    def optimize(self, inplace: bool = False, timeframe: str = '1d',
                start_date: Optional[DateLike] = None,
                end_date: Optional[DateLike] = None,
                threshold_range: Optional[np.ndarray] = None,
                runs: int = 10) -> pd.DataFrame:
        """Optimize strategy weights and voting threshold.

        Uses the optimize_weights() method from the base Strategy class to find
        optimal weights for combining signals from different strategies.
        Individual strategies should be optimized separately before combining.

        Args:
            inplace (bool, optional): Update strategy parameters. Defaults to False.
            timeframe (str, optional): Data frequency to use ('1d' or '5m'). Defaults to '1d'.
            start_date (DateLike, optional): Start date for optimization. Defaults to None.
            end_date (DateLike, optional): End date for optimization. Defaults to None.
            threshold_range (np.ndarray, optional): Voting thresholds to test. 
                Defaults to np.arange(0.2, 0.9, 0.1).
            runs (int, optional): Number of random initializations. Defaults to 10.

        Returns:
            pd.DataFrame: Results sorted by returns including optimized weights
                and threshold values
        """
        return self.optimize_weights(inplace, timeframe, start_date,
                                  end_date, threshold_range, runs)



# TODO:
# parrallelize backtest and optimize methods
# add ATR and ADX
# add transaction costs
# add risk management
# add algo to reduce number of trades (e.g. minimum holding period, dead zone, trend filter)
# add more backtest metrics (e.g. Sharpe ratio, drawdown, max drawdown, win/loss ratio, etc.)
# add more optimization methods (e.g. genetic algorithm, particle swarm optimization, bayesian, walk-forward, rolling)
