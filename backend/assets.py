''' Asset module which makes data querying, analysis and plotting simple
Just pass in a ticker from yfinance and analyze the asset in just a few lines of code
- statistical analysis
- resample
- price history plot
- candlestick with volume plot
- MA plot
- returns distribution plot
'''

import yfinance as yf
import pandas as pd
from pandas.core.frame import DataFrame
import numpy as np
import psycopg as pg
from datetime import datetime, date
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from scipy import stats
from config import DB_CONFIG
from typing import Optional

DateLike = str | datetime | date | pd.Timestamp

class Asset():
    ''' Asset class handles all the data processing and plotting functions
    - Queries data from the database
    - if not available, download from yfinance and add to db to set up future tracking
    - prepares data for analysis and plotting
    '''

    def __init__(self, ticker: str, from_db: bool = True) -> None:
        '''Instantiates the asset class and gets data from the database

        Args:
            ticker (str): ticker string from yfinance
            from_db (bool): whether to get data from db or yfinance.
                Defaults to True
        '''
        self.ticker = ticker
        if not from_db:
            self.__download_data()
        else:
            self.__get_data()

    def __repr__(self) -> str:
        return f'Asset({self.ticker!r})'
    
    def __eq__(self, other) -> bool:
        return self.ticker == other.ticker
    
    def __hash__(self) -> int:
        return hash(self.ticker)

    def __get_data(self) -> None:
        """Gets data from the database and calculate additional columns

        - Tries to query db for ticker data
        - If not available, add new data
        - Calculate returns and log returns
        - Store ticker metadata
        """
        # query db and check if ticker exists
        with pg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:

                cur.execute("SELECT date, open, high, low, close, adj_close, volume FROM daily WHERE ticker = %s", (self.ticker,))
                # if not, add new ticker and requery
                if cur.rowcount == 0:
                    self.__insert_new_ticker()
                    cur.execute("SELECT date, open, high, low, close, adj_close, volume FROM daily WHERE ticker = %s", (self.ticker,))

                data = cur.fetchall()

                # get metadata like asset type and currency
                cur.execute("SELECT asset_type, currency, sector, timezone FROM tickers WHERE ticker = %s", (self.ticker,))
                self.asset_type, self.currency, self.sector, self.timezone = cur.fetchone()

                # reindex data and calculate returns and log returns
                self.daily = pd.DataFrame(data, columns=['date', 'open', 'high', 'low', 'close', 'adj_close', 'volume']).set_index('date')
                self.daily = self.daily.astype(float)
                self.daily.index = pd.to_datetime(self.daily.index)
                self.daily = self.daily.sort_index()
                self.daily['log_rets'] = np.log(self.daily['adj_close'] / self.daily['adj_close'].shift(1))
                self.daily['rets'] = self.daily['adj_close'].pct_change()

                if self.asset_type == 'Mutual Fund':
                    self.five_minute = self.daily
                    return

                # same for five minute data
                cur.execute("SELECT date, open, high, low, close, adj_close, volume FROM five_minute WHERE ticker = %s", (self.ticker,))
                self.five_minute = pd.DataFrame(cur.fetchall(), columns=['date', 'open', 'high', 'low', 'close', 'adj_close', 'volume']).set_index('date')
                self.five_minute = self.five_minute.astype(float)
                self.five_minute.index = pd.to_datetime(self.five_minute.index).tz_convert(self.timezone)
                self.five_minute = self.five_minute.sort_index()
                self.five_minute['log_rets'] = np.log(self.five_minute['adj_close'] / self.five_minute['adj_close'].shift(1))
                self.five_minute['rets'] = self.five_minute['adj_close'].pct_change()

    def __insert_new_ticker(self) -> None:
        """Downloads and inserts new ticker to database
        
        - Downloads ticker from yfinance
        - Get ticker metadata and insert into tickers table
        - Clean and transform daily and 5min data
        - Batch insert into database
        """
        print(f"{self.ticker} is not yet available in database. Downloading from yfinance...")

        # Ticker table data
        ticker = yf.Ticker(self.ticker)

        # Check valid ticker
        if ticker.history().empty:
            print(f'{self.ticker} is an invalid yfinance ticker')
            return

        # transform metadata for insertion to database
        comp_name = ticker.info['shortName'].replace("'", "''")
        exchange = ticker.info['exchange']
        currency = ticker.info['currency']
        in_pence = False
        if currency == 'GBp':
            currency = 'GBP'
            in_pence = True
        start_date = pd.to_datetime('today').date()
        timezone = ticker.info['timeZoneShortName']
        asset_type = ticker.info['quoteType']
        if asset_type == 'MUTUALFUND':
            asset_type = 'Mutual Fund'
        elif asset_type != 'ETF':
            asset_type = asset_type.capitalize()

        # map exchanges according to pandas market calendar
        exchange_mapping = {
            'NYQ': 'NYSE',
            'NMS': 'NASDAQ',
            'NGM': 'NASDAQ',
            'PCX': 'NYSE',
            'PNK': 'stock',
        }
        exchange = exchange_mapping.get(exchange, exchange)

        # special handling for optional metadata
        try:
            market_cap = ticker.info['marketCap']
        except KeyError:
            market_cap = None

        try:
            sector = ticker.info['sector']
        except KeyError:
            if asset_type == 'Cryptocurrency':
                sector = 'Cryptocurrency'
            else:
                sector = None

        print(f'Inserting to DB {ticker=}, {comp_name=}, {exchange=}, {currency=}, {asset_type=}, {market_cap=}, {sector=}, {timezone=}')

        # Get daily data from 2020, clean and transform
        daily_data = yf.download(self.ticker, start='2020-01-01', auto_adjust=False)
        daily_data = daily_data.droplevel(1, axis=1)
        daily_data['ticker'] = self.ticker
        clean_daily = self.__clean_data(daily_data)
        clean_daily = clean_daily.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
        # adj_close column might not be available, especially for crypto
        if 'Adj Close' not in clean_daily.columns or asset_type == 'Mutual Fund':
            clean_daily['adj_close'] = clean_daily['close']
        else:
            clean_daily = clean_daily.rename(columns={'Adj Close': 'adj_close'})

        if in_pence:
            clean_daily[['open', 'high', 'low', 'close', 'adj_close']] /= 100

        # Get 5min data
        if asset_type != 'Mutual Fund':
            five_min_data = yf.download(self.ticker, interval='5m', auto_adjust=False)
            five_min_data = five_min_data.droplevel(1, axis=1)
            five_min_data['ticker'] = self.ticker
            clean_five_min = self.__clean_data(five_min_data)
            clean_five_min = clean_five_min.rename(columns={'Datetime': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
            if 'Adj Close' not in clean_five_min.columns:
                clean_five_min['adj_close'] = clean_five_min['close']
            else:
                clean_five_min = clean_five_min.rename(columns={'Adj Close': 'adj_close'})

            if in_pence:
                clean_five_min[['open', 'high', 'low', 'close', 'adj_close']] /= 100



        # Insert to database
        with pg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT DISTINCT LEFT(currency_pair, 3) FROM daily_forex;')
                currencies = [cur[0] for cur in cur.fetchall()]

                # if asset's currency is not in db, add all possible pairs
                if currency not in currencies:
                    self.__add_new_currency(cur, conn, currencies, currency)

                # insert metadata into db
                cur.execute("INSERT INTO tickers (ticker, comp_name, exchange, sector, market_cap, start_date, currency, asset_type, timezone) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", (self.ticker, comp_name, exchange, sector, market_cap, start_date, currency, asset_type, timezone))

                # batch insertion for price data
                BATCH_SIZE = 1000
                batch_count = 0
                rows_inserted = 0

                # insert daily data
                for _, row in clean_daily.iterrows():
                    cur.execute("INSERT INTO daily (ticker, date, open, high, low, close, adj_close, volume) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", (row['ticker'], row['date'], row['open'], row['high'], row['low'], row['close'], row['adj_close'], row['volume']))
                    batch_count += 1
                    rows_inserted += 1

                    if batch_count >= BATCH_SIZE:
                        conn.commit()
                        batch_count = 0

                if batch_count > 0:
                    conn.commit()
                    batch_count = 0

                print(f'daily_{rows_inserted=}')
                rows_inserted = 0

                # insert 5min data
                if asset_type != 'Mutual Fund':
                    for _, row in clean_five_min.iterrows():
                        cur.execute("INSERT INTO five_minute (ticker, date, open, high, low, close, adj_close, volume) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", (row['ticker'], row['date'], row['open'], row['high'], row['low'], row['close'], row['adj_close'], row['volume']))
                        batch_count += 1
                        rows_inserted += 1

                        if batch_count >= BATCH_SIZE:
                            conn.commit()
                            batch_count = 0

                    if batch_count > 0:
                        conn.commit()
                        batch_count = 0

                    print(f'five_min_{rows_inserted=}')


    def __clean_data(self, df: DataFrame) -> DataFrame:
        """Cleans OHLC data to ensure data passes db table price checks

        Args:
            df (pandas.core.frame.DataFrame): df to be cleaned

        Returns:
            pandas.core.frame.DataFrame: cleaned df
        """
        # ensure appropriate high and low values
        mask = (df['High'] < df['Open']) | (df['High'] < df['Close']) | (df['Low'] > df['Open']) | (df['Low'] > df['Close'])
        clean = df[~mask].copy()
        temp = df[mask].copy()

        temp['High'] = temp[['Open', 'Close', 'High']].max(axis=1)
        temp['Low'] = temp[['Open', 'Close', 'Low']].min(axis=1)
        clean = pd.concat([clean, temp], axis=0)
        clean = clean.reset_index()

        return clean
    
    def __download_data(self) -> None:
        """Downloads ticker and does not insert to database
        
        - Downloads ticker from yfinance
        - Get currency and asset type
        - Cleans data
        """
        ticker = yf.Ticker(self.ticker)

        # Check valid ticker
        if ticker.history().empty:
            print(f'{self.ticker} is an invalid yfinance ticker')
            return

        asset_type = ticker.info['quoteType']
        if asset_type == 'MUTUALFUND':
            asset_type = 'Mutual Fund'
        elif asset_type != 'ETF':
            asset_type = asset_type.capitalize()

        self.asset_type = asset_type
        self.currency = ticker.info['currency']
        is_pence = False
        if self.currency == 'GBp':
            self.currency = 'GBP'
            is_pence = True
        self.timezone = ticker.info['timeZoneShortName']

        daily_data = yf.download(self.ticker, start='2020-01-01', auto_adjust=False)
        daily_data = daily_data.droplevel(1, axis=1)
        clean_daily = self.__clean_data(daily_data)
        clean_daily = clean_daily.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
        if 'Adj Close' not in clean_daily.columns:
            clean_daily['adj_close'] = clean_daily['close']
        else:
            clean_daily = clean_daily.rename(columns={'Adj Close': 'adj_close'})
        if is_pence:
            clean_daily[['open', 'high', 'low', 'close', 'adj_close']] /= 100

        self.daily = clean_daily.set_index('date').astype(float)
        self.daily.index = pd.to_datetime(self.daily.index)
        self.daily = self.daily.sort_index()
        self.daily['log_rets'] = np.log(self.daily['adj_close'] / self.daily['adj_close'].shift(1))
        self.daily['rets'] = self.daily['adj_close'].pct_change()

        if self.asset_type == 'Mutual Fund':
            self.five_minute = self.daily
            return

        five_min_data = yf.download(self.ticker, interval='5m', auto_adjust=False)
        five_min_data = five_min_data.droplevel(1, axis=1)
        clean_five_min = self.__clean_data(five_min_data)
        clean_five_min = clean_five_min.rename(columns={'Datetime': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
        if 'Adj Close' not in clean_five_min.columns:
            clean_five_min['adj_close'] = clean_five_min['close']
        else:
            clean_five_min = clean_five_min.rename(columns={'Adj Close': 'adj_close'})
        if is_pence:
            clean_five_min[['open', 'high', 'low', 'close', 'adj_close']] /= 100

        self.five_minute = clean_five_min.set_index('date').astype(float)
        self.five_minute.index = pd.to_datetime(self.five_minute.index).tz_convert(self.timezone)
        self.five_minute = self.five_minute.sort_index()
        self.five_minute['log_rets'] = np.log(self.five_minute['adj_close'] / self.five_minute['adj_close'].shift(1))
        self.five_minute['rets'] = self.five_minute['adj_close'].pct_change()

    def __add_new_currency(self, cur: pg.Cursor, conn: pg.Connection, currencies: list, currency: str) -> None:
        """Adds new currency to database to be tracked

        Args:
            cur (psycopg.Cursor): connection cursor to execute data insertion
            conn (psycopg.Connection): Database connection
            currencies (list): List of currencies in database
            currency (str): New currency to be added
        """
        # create all possible pairs and format according to yfinance
        new_forex = []
        for curr in currencies:
            new_forex.append(f'{curr}{currency}=X')
            new_forex.append(f'{currency}{curr}=X')

        # get new forex data from yfinance
        df_list = []
        for pair in new_forex:
            data = yf.download(pair, start='2020-01-01')
            data = data.droplevel(1, axis=1)
            data['currency_pair'] = f'{pair[:3]}/{pair[3:6]}'  # reformat according to db
            df_list.append(data)

        # combine, clean and transform data
        df = pd.concat(df_list)
        clean = self.clean_data(df)
        clean.drop(columns=['Adj Close', 'Volume'], inplace=True)
        clean = clean.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close'})

        # batch insertion
        BATCH_SIZE = 1000
        batch_count = 0
        for _, row in clean.iterrows():
            cur.execute("INSERT INTO daily_forex (currency_pair, date, open, high, low, close) VALUES (%s, %s, %s, %s, %s, %s)", (row['currency_pair'], row['date'], row['open'], row['high'], row['low'], row['close']))
            batch_count += 1

            if batch_count >= BATCH_SIZE:
                conn.commit()
                batch_count = 0

        if batch_count > 0:
            conn.commit()

    def plot_price_history(self, *, timeframe: str = '1d', start_date: Optional[DateLike] = None,
                        end_date: Optional[DateLike] = None, resample: Optional[str] = None, 
                        line: Optional[int | float] = None) -> go.Figure:
        """Plots the price history of the underlying asset.

        Args:
            timeframe (str, optional): Determines which dataframe to use ('1d' for daily or '5m' for five minute data). 
                Defaults to '1d'.
            start_date (DateLike, optional): Start date for plotting range. Defaults to None.
            end_date (DateLike, optional): End date for plotting range. Defaults to None.
            resample (str, optional): Resampling frequency in pandas format (e.g., 'B' for business day).
                Used primarily with 5-min data to remove flat regions during market close. Defaults to None.
            line (float | int, optional): Y-value for horizontal threshold line. Defaults to None.

        Returns:
            (plotly.graph_objects.Figure): Price history of underlying asset.
        """

        # choose data based on specified timeframe
        data = self.daily['close'] if timeframe == '1d' else self.five_minute['close']

        # slice data according to specified start and end dates
        if start_date is not None:
            data = data[data.index >= start_date]
        if end_date is not None:
            data = data[data.index <= end_date]

        if resample is not None:
            data = data.resample(resample).last()

        data = data.dropna()
        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        fig = go.Figure()
        # Add price trace
        fig.add_trace(
            go.Scatter(
                x=data.index.strftime(format),
                y=data,
                name=f'{self.ticker} Price',
                connectgaps=True
            )
        )

        # add line
        if line is not None:
            fig.add_hline(y=line,
                line_dash="dash",
                line_color="red",
            )

        fig.update_layout(
            title=f'{self.ticker} Price History',
            xaxis_title='Date',
            yaxis_title=f'Price ({self.currency})',
            xaxis=dict(
                type='category',
                categoryorder='category ascending',
                nticks=5
            )
        )

        fig.show()

        return fig


    def plot_candlestick(self, *, timeframe: str = '1d', start_date: Optional[DateLike] = None, end_date: Optional[DateLike] = None, 
                         resample: Optional[str] = None, volume: bool = True) -> go.Figure:
        """Plots the candlestick chart of the underlying asset.

        Args:
            timeframe (str, optional): Determines which dataframe to use ('1d' for daily or '5m' for five minute data). 
                Defaults to '1d'.
            start_date (DateLike, optional): Start date for plotting range. Defaults to None.
            end_date (DateLike, optional): End date for plotting range. Defaults to None.
            resample (str, optional): Resampling frequency in pandas format (e.g., 'B' for business day).
            volume (bool): Whether to plot volume bars or not. Defaults to True

        Returns:
            (plotly.graph_objects.Figure): Candlestick chart of underlying asset.
        """

        if resample is not None:
            data = self.resample(period=resample, five_min=True if timeframe != '1d' else False)
        else:
            data = self.daily if timeframe == '1d' else self.five_minute

        if end_date is not None:
            data = data[data.index <= end_date]
        if start_date is not None:
            data = data[data.index >= start_date]

        data = data.dropna()

        # create or use existing figure
        if volume:
            fig = make_subplots(rows=2, cols=1, 
                            shared_xaxes=True, 
                            vertical_spacing=0.03, 
                            row_heights=[0.7, 0.3])
        else:
            fig = go.Figure()

        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        # Create candlestick trace
        candlestick = go.Candlestick(
            x=data.index.strftime(format),
            open=data['open'],
            high=data['high'],
            low=data['low'],
            close=data['close'],
            name='OHLC'
        )

        if volume:
            colors = ['#26A69A' if close >= open else '#EF5350' 
            for open, close in zip(data['open'], data['close'])]

            volume_bars = go.Bar(
                x=data.index.strftime(format),
                y=data['volume'],
                name='Volume',
                marker=dict(
                    color=colors,
                    line=dict(color=colors)
                )
            )

            fig.add_trace(candlestick, row=1, col=1)
            fig.add_trace(volume_bars, row=2, col=1)
        else:
            fig.add_trace(candlestick)

        # Update layout
        title = f'{self.ticker} Candlestick Chart'
        if volume:
            title += ' with Volume Bars'

        layout_updates = {
            'xaxis1_rangeslider_visible': False,
            'height': 800 if volume else 600
        }

        layout_updates['xaxis1'] = dict(
            type='category',
            categoryorder='category ascending',
            nticks=5
        )

        if volume:
            layout_updates[f'xaxis2_rangeslider_visible'] = False
            layout_updates['xaxis2'] = layout_updates['xaxis1']

        layout_updates['title'] = title

        layout_updates['yaxis_title'] = f'Price ({self.currency})'

        

        fig.update_layout(**layout_updates)

        fig.show()

        return fig

    def plot_SMA(self, *, window: int = 20, timeframe: str = '1d', start_date: Optional[DateLike] = None, end_date: Optional[DateLike] = None,
                 r: float = 0., ewm: bool = False, 
                 alpha: Optional[float] = None, halflife: Optional[float] = None, bollinger_bands: bool = False, num_std: float = 2.) -> go.Figure:
        """Plots the moving average price of the underlying asset.

        Args:
            window (int): Rolling window. Defaults to 20
            timeframe (str, optional): Determines which dataframe to use ('1d' for daily or '5m' for five minute data). 
                Defaults to '1d'.
            start_date (DateLike, optional): Start date for plotting range. Defaults to None.
            end_date (DateLike, optional): End date for plotting range. Defaults to None.
            r (float): risk-free rate. Defaults to 0.
            ewm (bool): Whether to use ewm (True) or rolling (False). Defaults to False
            alpha (float, optional): Alpha parameter for ewm. Defaults to None
            halflife (float, optional): Halflife parameter for ewm. Defaults to None
            bollinger_bands (bool): Whether to calculate bollinger bands or not. Defaults to False
            num_std (float): Number of standard deviations for bollinger bands. Defaults to 2.

        Returns:
            (plotly.graph_objects.Figure): Moving average price of underlying asset.
        """
        # get MA data
        data = self.rolling_stats(window=window, five_min=True if timeframe != '1d' else False,
                                r=r, ewm=ewm, alpha=alpha, halflife=halflife, 
                                bollinger_bands=bollinger_bands, num_std=num_std)
        
        if start_date is not None:
            data = data[data.index >= start_date]
        if end_date is not None:
            data = data[data.index <= end_date]

        data = data.dropna()

        # configure parameter text
        if alpha is not None:
            param = f'{alpha=}'
        elif halflife is not None:
            param = f'{halflife=}'
        else:
            param = f'{window=}'

        fig = go.Figure()
        format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'

        # Add main price line
        fig.add_trace(
            go.Scatter(
                x=data.index.strftime(format),
                y=data['close_mean'],
                line=dict(
                    color='#2962FF',
                    width=2,
                    dash='solid'
                ),
                name=f'{self.ticker} MA {param}'
            )
        )

        if bollinger_bands:
            # Add lower band
            fig.add_trace(go.Scatter(
                x=data.index.strftime(format),
                y=data['bol_low'],
                name='Lower Band',
                line=dict(color='#FF4081', width=1, dash='dash'),
                mode='lines',
                showlegend=True
                )
            )

            # Add upper band with fill
            fig.add_trace(go.Scatter(
                x=data.index.strftime(format),
                y=data['bol_up'],
                name='Upper Band',
                line=dict(color='#FF4081', width=1, dash='dash'),
                mode='lines',
                fill='tonexty',
                fillcolor='rgba(68, 68, 255, 0.1)',
                showlegend=True
                )
            )

        # update layout
        fig.update_layout(
            title=dict(
                text=f'{self.ticker} Moving Average ({param}) {f"with Bollinger Bands ({num_std=})" if bollinger_bands else ""}',
                x=0.5,  # Center the title
                y=0.95
            ),
            paper_bgcolor='white',
            plot_bgcolor='rgba(240,240,240,0.95)',
            xaxis=dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=None,
                type='category',
                categoryorder='category ascending',
                nticks=5
            ),
            yaxis=dict(
                showgrid=True,
                gridwidth=1,
                gridcolor='rgba(128,128,128,0.2)',
                title=f'Price ({self.currency})',
            ),
            legend=dict(
                yanchor="top",
                y=0.99,
                xanchor="left",
                x=0.01,
                bgcolor='rgba(255,255,255,0.8)'
            ),
            hovermode='x unified'
        )

        fig.show()

        return fig

    def plot_returns_dist(self, *, log_rets: bool = False, bins: int = 100,
                        show_stats: bool = True) -> go.Figure:
        """Plots the returns distribution histogram of the underlying asset.

        Args:
            log_rets (bool): Whether to use log returns (True) or normal returns (False)
                Defaults to False
            interactive (bool, optional): Whether to create an interactive Plotly graph (True) 
                or static Matplotlib graph (False). Defaults to True.
            show_stats (bool): Whether or not to show distribution stats. Defaults to True

        Returns:
            (plotly.graph_objects.Figure): Returns distribution histogram of underlying asset.
        """

        data = self.daily['log_rets'] if log_rets else self.daily['rets']
        data = data.dropna()

        # Calculate statistics
        stats_text = (
            f'Mean: {np.mean(data):.4f}<br>'
            f'Std Dev: {np.std(data):.4f}<br>'
            f'Skewness: {stats.skew(data):.4f}<br>'
            f'Kurtosis: {stats.kurtosis(data):.4f}'
        )

        fig = go.Figure()

        bins = np.linspace(data.min(), data.max(), bins + 1)

        # create histogram
        fig.add_trace(
            go.Histogram(
                x=data,
                xbins=dict(
                    start=bins[0],
                    end=bins[-1],
                    size=(bins[1] - bins[0])  # Forces exact bin width
                ),
                name=f'{self.ticker} Returns Distribution'
            )
        )

        # configure statsbox position
        xref = 'paper'
        yref = 'paper'

        if show_stats:
            fig.add_annotation(
                x=0.95,
                y=0.95,
                xref=xref,
                yref=yref,
                text=stats_text,
                showarrow=False,
                font=dict(size=10),
                align='left',
                bgcolor='white',
                bordercolor='black',
                borderwidth=1,
                xanchor='right',
                yanchor='top'
            )

        fig.update_layout(
            yaxis=dict(
                range=[0, None],
                rangemode='nonnegative'
            ),
            bargap=0.05
        )

        fig.update_layout(
                title=f'{self.ticker} {"Log" if log_rets else ""} Returns Distribution',
                xaxis_title='Returns',
                yaxis_title=f'Count'
            )

        fig.show()

        return fig

    def resample(self, period: str, five_min: bool = False) -> DataFrame:
        """Resamples the asset data

        Args:
            period (str): Resampling frequency in pandas format (e.g., 'B' for business day).
            five_min (bool): Whether to use 5min data (True) or daily data (False). Defaults to False

        Returns:
            pandas.core.frame.DataFrame: df of resampled data
        """
        if five_min:
            data = self.five_minute
        else:
            data = self.daily

        data = data.drop(columns=['rets', 'log_rets'])
        data = data.resample(period).agg({
            'open': 'first',     # First price of the month
            'high': 'max',       # Highest price of the month
            'low': 'min',        # Lowest price of the month
            'close': 'last',     # Last price of the month
            'adj_close': 'last', # Last adjusted price of the month
            'volume': 'sum',     # Total volume for the month
        })

        data['rets'] = data['adj_close'].pct_change()
        data['log_rets'] = np.log(data['adj_close'] / data['adj_close'].shift(1))

        data = data.dropna()

        return data

    def rolling_stats(self, *, window: int = 20, five_min: bool = False, r: float = 0., ewm: bool = False, 
                       alpha: Optional[float] = None, halflife: Optional[float] = None, bollinger_bands: bool = False, 
                       num_std: float = 2., sharpe_ratio: bool = False) -> DataFrame:
        """Calculate rolling stats for asset data

        Args:
            window (int): Rolling window. Defaults to 20
            five_min (bool): Whether to use 5min data (True) or daily data (False). Defaults to False
            r (float): risk-free rate. Defaults to 0.
            ewm (bool): Whether to use ewm (True) or rolling (False). Defaults to False
            alpha (float, optional): Alpha parameter for ewm. Defaults to None
            halflife (float, optional): Halflife parameter for ewm. Defaults to None
            bollinger_bands (bool): Whether to calculate bollinger bands or not. Defaults to False
            num_std (float): Number of standard deviations for bollinger bands. Defaults to 2.
            sharpe_ratio (bool): Whether or not to calculate rolling Sharpe ratio. Defaults to False

        Returns:
            pandas.core.frame.DataFrame: df of the rolling data with mean and standard deviation
                for close prices and returns as well as sharpe ratio if specified
        """

        if five_min:
            data = self.five_minute
            if self.asset_type == 'Cryptocurrency':
                annualization_factor = 252 * 24 * 12  # 24/7 trading
            else:
                annualization_factor = 252 * 78  # Assuming ~78 5-min periods per day
        else:
            data = self.daily
            annualization_factor = 252  # Trading days in a year

        roll_df = pd.DataFrame()

        param = {}
        if ewm:
            if alpha is not None:
                param['alpha'] = alpha
            elif halflife is not None:
                param['halflife'] = halflife
            else:
                param['span'] = window

        # calculate mean and std rolling data for close prices and returns
        cols = ['close', 'adj_close', 'rets', 'log_rets']
        for col in cols:
            if ewm:
                roll_df[f'{col}_mean'] = data[f'{col}'].ewm(**param).mean()
                roll_df[f'{col}_std'] = data[f'{col}'].ewm(**param).std()
            else:
                roll_df[f'{col}_mean'] = data[f'{col}'].rolling(window=window).mean()
                roll_df[f'{col}_std'] = data[f'{col}'].rolling(window=window).std()

        roll_df = roll_df.dropna()

        # Calculate annualized Sharpe ratio
        if sharpe_ratio:
            daily_rf_rate = (1 + r) ** (1/annualization_factor) - 1
            excess_returns = roll_df['rets_mean'] - daily_rf_rate
            roll_df['sharpe'] = (excess_returns / roll_df['rets_std']) * np.sqrt(annualization_factor)

        # add bollinger bands
        if bollinger_bands:
            roll_df = self._add_bollinger_bands(roll_df, num_std=num_std)

        return roll_df

    @property
    def stats(self) -> dict:
        """Basic statistics for the underlying asset
           - Return statistics
           - Price statistics
           - Distribution statistics

        Returns:
        dict: dictionary containing statistics of the asset
        """
        stats = {}

        # return statistics
        stats['returns'] = {
            'total_return': (self.daily['close'].iloc[-1] / 
                            self.daily['close'].iloc[0]) - 1,
            'daily_mean': self.daily['rets'].mean(),
            'daily_std': self.daily['rets'].std(),
            'daily_median': self.daily['rets'].median(),
            'annualized_vol': self.daily['rets'].std() * np.sqrt(252)
        }

        stats['returns'] = {k: float(v) for k, v in stats['returns'].items()}

        # price statistics
        stats['price'] = {
            'high': self.daily['high'].max(),
            'low': self.daily['low'].min(),
            '52w_high': self.daily[self.daily.index >= datetime.now() - pd.Timedelta(weeks=52)]['high'].max(),
            '52w_low': self.daily[self.daily.index >= datetime.now() - pd.Timedelta(weeks=52)]['low'].max(),
            'current': self.daily['close'].iloc[-1]
        }

        stats['price'] = {k: float(v) for k, v in stats['price'].items()}

        # distribution statistics
        stats['distribution'] = {
            'skewness': self.daily['rets'].skew(),
            'kurtosis': self.daily['rets'].kurtosis()
        }

        stats['distribution'] = {k: float(v) for k, v in stats['distribution'].items()}

        # TODO:
        # add risk statistics: var95, cvar95, max_drawdown, drawdown_period, downside volatility
        # add risk_adjusted returns:  sharpe ratio, sortino ratio, calmar ratio
        # add distribution: normality test, jarque_bera
        # add trading stats: pos/neg days, best/worst day, avg up/down day, vol_mean, vol_std

        return stats

    def _add_bollinger_bands(self, df: DataFrame, num_std: float = 2.) -> DataFrame:
        """Helper method to calculate bollinger bands

        Args:
            df (pandas.core.frame.DataFrame): df to add bollinger bands onto
            num_std (float): Number of standard deviations away for bollinger bands

        Returns:
            pandas.core.frame.DataFrame: original df with bollinger bands columns
            """
        df['bol_up'] = df['close_mean'] + num_std * df['close_std']
        df['bol_low'] = df['close_mean'] - num_std * df['close_std']

        return df

# TODO:
# plot more diagrams
# simple default dashboard
# currency conversion
# remove missing dates using type='category'
