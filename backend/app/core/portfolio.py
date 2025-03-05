import numpy as np
import pandas as pd
from app.core.asset import Asset
from collections import Counter, defaultdict, namedtuple
import psycopg as pg
import datetime
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from scipy import stats
import json
from dotenv import load_dotenv
import os
from itertools import cycle, islice
from supabase import Client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_SERVICE_ROLE = os.getenv('SUPABASE_SERVICE_ROLE')

DateLike = str | datetime.datetime | datetime.date | pd.Timestamp

# store how many shares e.g. NVDA 30 shares
# buy/sell: give date and either shares or price
# Portfolio({AAPL: {'shares': 20, 'avg_price': 100}, NVDA: {'shares': 15, 'avg_price': 20}})
# Portfolio([{'asset': 'AAPL', 'shares': 20, 'avg_price': 100}, {'asset': 'NVDA', 'shares': 15, 'avg_price': 20}])
# store total money invested and num of shares for each asset

transaction = namedtuple('transaction', ['type', 'asset', 'shares', 'value', 'profit', 'date', 'id'])


class Portfolio:

    def __init__(self, assets: list[dict[str, str | float]] | None = None, cash: float | None = None, currency: str | None = None, r: float = 0.02):
        self.holdings = defaultdict(float)
        self.currency = 'USD' if currency is None else currency
        self.cost_bases = defaultdict(float)
        self.transactions = []
        self.assets = []
        self.forex_cache = {}
        self.asset_mapping = {}
        self.r = r
        self.cash = 0.0
        self.id = 0

        if assets:  # Only process if assets provided
            self.assets.extend([Asset(holdings['asset']) for holdings in assets])  # store copy of assets

            if currency is None:
                self.currency = Counter((ast.currency for ast in self.assets)).most_common()[0][0]
            else:
                self.currency = currency

            for ast in self.assets:
                del ast.five_minute
                if ast.currency != self.currency:
                    self._convert_ast(ast)

            for i, ast in enumerate(self.assets):
                self.holdings[ast] = assets[i]['shares']
                if ast.currency != self.currency:
                    avg_price = self._convert_price(assets[i]['avg_price'], ast.currency)
                else:
                    avg_price = assets[i]['avg_price']

                self.cost_bases[ast] = avg_price
            if cash is not None:
                self.cash = cash

        self.market = Asset('SPY')
        self._convert_ast(self.market)

    def _convert_price(self, price: float, currency: str, date: DateLike | None = None) -> float:
        date = self._parse_date(date)[:10]

        f = currency
        t = self.currency
        key = f'{f}/{t}'
        while True:
            if date in self.forex_cache[key].index:
                rate = self.forex_cache[key].loc[date, 'close']
                break
            else:
                date_obj = datetime.datetime.strptime(date, '%Y-%m-%d')
                date_obj -= datetime.timedelta(days=1)
                date = date_obj.strftime('%Y-%m-%d')

        return float(price * rate)

    def _convert_ast(self, asset: Asset) -> None:
        f = asset.currency
        t = self.currency
        if f == t:
            return
        key = f'{f}/{t}'
        if key not in self.forex_cache:
            sb = Client(SUPABASE_URL, SUPABASE_KEY)
            forex = sb.table('daily_forex').select('currency_pair, date, close').eq('currency_pair', key).execute().data
            forex = pd.DataFrame(forex).set_index('date')
            forex.index = pd.to_datetime(forex.index)
            forex = forex.sort_index()
            forex['close'] = forex['close'].astype(float)
            self.forex_cache[key] = forex

        forex = self.forex_cache[key]

        frx = forex.reindex_like(asset.daily, method='ffill')[['close']]
        asset.daily[['open', 'high', 'low', 'close', 'adj_close']] = asset.daily[['open', 'high', 'low', 'close', 'adj_close']].mul(frx['close'], axis=0)
        asset.daily['log_rets'] = np.log(asset.daily['adj_close'] / asset.daily['adj_close'].shift(1))
        asset.daily['rets'] = asset.daily['adj_close'].pct_change(fill_method=None)

        asset.currency = self.currency

    def _parse_date(self, date: DateLike | None = None) -> str:
        if date is None:
            date = datetime.date.today()

        if isinstance(date, pd.Timestamp):
            # Convert pandas.Timestamp to datetime or date
            date = date.to_pydatetime() if not pd.isna(date) else date.date()

        if isinstance(date, datetime.datetime):
            date = date.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(date, datetime.date):  # datetime.date object
            date = date.strftime('%Y-%m-%d')

        return date
    
    def _get_price(self,  ast: Asset, date: str) -> float:
        date = date[:10]
        while True:
            if date in ast.daily.index:
                price = ast.daily.loc[date, 'adj_close']
                return price
            else:
                date_obj = datetime.datetime.strptime(date, '%Y-%m-%d')
                date_obj -= datetime.timedelta(days=1)
                date = date_obj.strftime('%Y-%m-%d')

    def deposit(self, value: float, currency: str | None = None, date: DateLike | None = None) -> tuple[transaction, float]:
        date = self._parse_date(date)

        if currency is None:
            currency = self.currency

        if currency != self.currency:
            value = self._convert_price(value, currency, date)
        value = round(float(value), 2)

        t = transaction('DEPOSIT', 'Cash', 0.0, value, 0., date, self.id)
        self.transactions.append(t)
        self.cash += value
        self.id += 1
        return t, self.cash

    def withdraw(self, value: float, currency: str | None = None, date: DateLike | None = None) -> tuple[transaction, float]:
        date = self._parse_date(date)

        if currency is None:
            currency = self.currency

        if currency != self.currency:
            value = self._convert_price(value, currency, date)
        value = round(float(value), 2)

        if self.cash - value < 0:
            raise ValueError('Not enough money')

        t = transaction('WITHDRAW', 'Cash', 0.0, value, 0., date, self.id)
        self.transactions.append(t)
        self.cash -= value
        self.id += 1
        return t, self.cash

    def buy(self, asset: Asset, *, shares: float | None = None, value: float | None = None, 
            date: DateLike | None = None, currency: str | None = None) -> tuple[transaction, float]:

        date = self._parse_date(date)

        if currency is None:
            currency = self.currency

        if asset not in self.assets:
            ast = Asset(asset.ticker)  # create copy
            del ast.five_minute
            if ast.currency != self.currency:
                self._convert_ast(ast)
            self.assets.append(ast)

        # get price at buy
        idx = self.assets.index(asset)
        ast = self.assets[idx]

        if value is not None:
            if currency != self.currency:
                value = self._convert_price(value, currency, date)

        if shares is None:
            # get shares from value / price at date
            price = self._get_price(ast, date)
            shares = value / price

        if value is None:
            # get value from shares * price at date
            price = self._get_price(ast, date)
            value = shares * price
        value = round(float(value), 2)

        # update portfolio values
        if self.cash - value < -0.01:
            raise ValueError('Not enough money')

        t = transaction('BUY', ast, round(float(shares), 5), value, 0., date, self.id)
        self.transactions.append(t)
        old_cost_basis = self.cost_bases[ast] * self.holdings[ast]
        self.holdings[ast] += float(shares)
        self.cost_bases[ast] = (old_cost_basis + value) / self.holdings[ast]
        self.cash -= value
        self.id += 1
        return t, self.cash

    def sell(self, asset: Asset, *, shares: float | None = None, value: float | None = None, 
            date: DateLike | None = None, currency: str | None = None) -> tuple[transaction, float]:

        date = self._parse_date(date)

        if currency is None:
            currency = self.currency

        # get price at sell
        idx = self.assets.index(asset)
        ast = self.assets[idx]

        if value is not None:
            if currency != self.currency:
                value = self._convert_price(value, currency, date)

        if shares is None:
            # get shares from value / price at date
            price = self._get_price(ast, date)
            shares = value / price

        if value is None:
            # get value from shares * price at date
            price = self._get_price(ast, date)
            value = shares * price

        value = round(float(value), 2)
        profit = (value - (self.cost_bases[ast] * shares))
        t = transaction('SELL', ast, round(float(shares), 5), value, round(float(profit), 2), date, self.id)
        self.transactions.append(t)

        self.holdings[ast] -= float(shares)
        self.cash += value
        if self.holdings[ast] < 1e-5:
            del self.holdings[ast]
            del self.assets[idx]
        self.id += 1
        return t, self.cash

    def pie_chart(self, data: dict, title: str) -> go.Figure:

        sorted_by_weight = sorted(data, key=data.get, reverse=True)
        sorted_dict = {k: data[k] for k in sorted_by_weight}

        fig = go.Figure()

        # Create custom text array - empty string for small values
        text = [f'{p*100:.1f}%<br>{"Crypto" if l == "Cryptocurrency" else l}' 
                if p >= 0.05 else '' for l, p in sorted_dict.items()]
        colors = list(islice(cycle(px.colors.sequential.RdBu_r), len(data)))

        fig.add_trace(go.Pie(
            labels=list(sorted_dict.keys()),
            values=list(sorted_dict.values()),
            text=text,
            textinfo='text',
            hoverinfo='label+percent',
            textposition='auto',
            hole=0.4,
            marker=dict(colors=colors)
        ))

        fig.update_layout(
            showlegend=False,
            paper_bgcolor='rgba(0, 0, 0, 0)',
            plot_bgcolor='rgba(0, 0, 0, 0)',
            font=dict(color='white'),
            width=400,
            annotations=[dict(
                x=0.5,
                y=0.5,
                showarrow=False,
                text=title,
                font=dict(size=15)
            )]
        )

        return fig

    def holdings_chart(self) -> go.Figure | None:
        weights = self.weights
        if not weights:
            return None
        data = {k.ticker: v for k, v in weights.items()}
        return self.pie_chart(data, 'Holdings')

    def asset_type_exposure(self) -> go.Figure | None:
        data = defaultdict(float)
        weights = self.weights
        if not weights:
            return None
        for ast, weight in weights.items():
            data[ast.asset_type] += weight
        return self.pie_chart(data, 'Asset Type<br>Exposure')

    def sector_exposure(self) -> go.Figure | None:
        data = defaultdict(float)
        weights = self.weights
        if not weights:
            return None
        for ast, weight in weights.items():
            if ast.sector is not None:
                data[ast.sector] += weight

        data = {k: v / sum(data.values()) for k, v in data.items()}
        return self.pie_chart(data, 'Sector<br>Exposure')

    def returns_dist(self, bins: int = 100, show_stats: bool = True) -> go.Figure | None:
        data = self.returns.dropna()
        if data.empty:
            return None
        fig = go.Figure()

        # Calculate statistics
        # stats_text = (
        #     f'Mean: {np.mean(data):.4f}<br>'
        #     f'Std Dev: {np.std(data):.4f}<br>'
        #     f'Skewness: {stats.skew(data):.4f}<br>'
        #     f'Kurtosis: {stats.kurtosis(data):.4f}'
        # )

        bins = np.linspace(data.min(), data.max(), bins + 1)

        fig.add_trace(
            go.Histogram(
                x=data,
                xbins=dict(
                    start=bins[0],
                    end=bins[-1],
                    size=(bins[1] - bins[0])
                ),
                # name='Portfolio Returns Distribution'
            )
        )

        xref = 'paper'
        yref = 'paper'

        # if show_stats:
        #         fig.add_annotation(
        #             x=0.95,
        #             y=0.95,
        #             xref=xref,
        #             yref=yref,
        #             # text=stats_text,
        #             showarrow=False,
        #             font=dict(size=10),
        #             align='left',
        #             bgcolor='white',
        #             bordercolor='black',
        #             borderwidth=1,
        #             xanchor='right',
        #             yanchor='top'
        #         )

        fig.update_layout(
                yaxis=dict(
                    range=[0, None],
                    rangemode='nonnegative',
                    gridcolor='rgba(128, 128, 128, 0.2)',
                ),
                bargap=0.05,
                xaxis_title='Returns',
                yaxis_title='Count',
                paper_bgcolor='rgba(0, 0, 0, 0)',
                plot_bgcolor='rgba(0, 0, 0, 0)',
                font=dict(color='white')
            )

        

        return fig

    def rebalance(self, target_weights: dict, inplace: bool = False) -> list[transaction]:
        for ast in target_weights:
            if ast not in self.assets:
                raise ValueError(f'Asset {ast} not in portfolio')

        if not inplace:
            new_port = Portfolio(
                assets=[{'asset': ast.ticker, 'shares': self.holdings[ast], 'avg_price': self.cost_bases[ast]} for ast in self.assets],
                cash=self.cash,
                currency=self.currency,
                r=self.r
                )
            new_port.cash = self.cash
        else:
            new_port = self

        total_weight = sum(target_weights.values())
        if total_weight <= 0:
            raise ValueError('Total weight must be positive')
        target_weights = {ast: w / total_weight for ast, w in target_weights.items()}

        values = self.holdings_value()
        total_value = sum(values.values())
        curr_weight = self.weights
        weight_diff = {ast: target_weights.get(ast, 0) - curr_weight[ast] for ast in self.assets}
        sorted_assets = sorted(self.assets, key=lambda x: weight_diff[x])

        for ast in sorted_assets:
            if ast not in target_weights:
                new_port.sell(ast, shares=new_port.holdings[ast], currency=self.currency)
            else:
                t_value = target_weights[ast] * total_value
                if t_value < values[ast] and values[ast] - t_value > 1e-2:
                    new_port.sell(ast, value=values[ast] - t_value, currency=self.currency)
                elif t_value > values[ast] and t_value - values[ast] > 1e-2:
                    new_port.buy(ast, value=t_value - values[ast], currency=self.currency)

        if not inplace:
            return new_port.transactions

    def from_transactions(self, transactions: list[transaction]):
        for t in transactions:
            if t.type == 'DEPOSIT':
                self.deposit(t.value, currency=self.currency, date=t.date)
            elif t.type == 'WITHDRAW':
                self.withdraw(t.value, currency=self.currency, date=t.date)
            elif t.type == 'BUY':
                self.buy(t.asset, shares=t.shares, value=t.value, date=t.date, currency=self.currency)
            elif t.type == 'SELL':
                self.sell(t.asset, shares=t.shares, value=t.value, date=t.date, currency=self.currency)

    def from_212(self, filename: str) -> list[transaction]:
        df = pd.read_csv(filename)
        df = df[['Action', 'Time', 'Ticker', 'No. of shares', 'Currency (Price / share)', 'Total']]
        df.rename(columns={'Action': 'action', 'Time': 'time', 'Ticker': 'ticker', 'No. of shares': 'shares', 'Currency (Price / share)': 'currency', 'Total': 'value'}, inplace=True)
        df['time'] = df['time'].apply(lambda x: x[:10])
        df['time'] = pd.to_datetime(df['time'])
        df.loc[df['currency'] == 'GBX', 'currency'] = 'GBP'
        def clean_action(x):
            if x == 'Deposit':
                return x.lower()
            else:
                return x[7:]
        df['action'] = df['action'].apply(lambda x: clean_action(x))
        df['time'] = df['time'].dt.date
        df.loc[df['currency'] == 'GBP', 'ticker'] += '.L'
        tickers = list(df['ticker'].dropna().unique())
        asset_mapping = {ticker: Asset(ticker) for ticker in tickers}
        last_transaction = len(self.transactions)

        for _, row in df.iterrows():
            if row['action'] == 'buy':
                self.buy(asset_mapping[row['ticker']], shares=row['shares'], value=row['value'], date=row['time'], currency=self.currency)
            elif row['action'] == 'sell':
                self.sell(asset_mapping[row['ticker']], shares=row['shares'], value=row['value'], date=row['time'], currency=self.currency)
            elif row['action'] == 'deposit':
                self.deposit(row['value'], currency=self.currency, date=row['time'])

        return self.transactions[last_transaction:]

    def from_vanguard(self, filename: str) -> list[transaction]:
        df = pd.read_excel(filename, sheet_name=1)

        # Get cash transactions
        eoft = df[df['ISA'] == 'Balance'].index[0]
        soft = df[df['ISA'] == 'Cash Transactions'].index[0]
        cash = df.iloc[soft+2:eoft+1]
        cash = cash.dropna(axis=1, how='all')
        cash.columns = cash.iloc[0]
        cash = cash[1:-1]
        cash = cash[['Date', 'Details', 'Amount']]
        cash = cash[cash['Details'].str.contains('Deposit|Withdrawal', na=False)]
        def clean_details(x):
            if 'Deposit' in x:
                return 'Deposit'
            else:
                return 'Withdrawal'
        cash['Action'] = cash['Details'].apply(lambda x: clean_details(x))
        cash = cash.drop(columns=['Details'])
        cash['Date'] = cash['Date'].astype(str).str.slice(0, 10)
        cash = cash.rename(columns={'Amount': 'Cost'})

        # Get asset transactions
        sost = df[df['ISA'] == 'Investment Transactions'].index[0]
        inv = df.iloc[sost+2:]
        inv.columns = inv.iloc[0]
        inv = inv[1:-1]
        inv = inv[['Date', 'InvestmentName', 'Quantity', 'Cost']]
        def set_action(x):
            if x < 0:
                return 'Sell'
            else:
                return 'Buy'
        inv['Action'] = inv['Quantity'].apply(lambda x: set_action(x))
        inv['Date'] = inv['Date'].astype(str).str.slice(0, 10)

        ticker_map = {
            'LifeStrategy 100% Equity Fund - Accumulation': '0P0000TKZO.L',
        }
        inv['InvestmentName'] = inv['InvestmentName'].str.strip()
        inv['Ticker'] = inv['InvestmentName'].map(ticker_map)
        inv = inv.drop(columns=['InvestmentName'])

        # Combine and sort
        df = pd.concat([cash, inv]).sort_values('Date')
        tickers = list(df['Ticker'].dropna().unique())
        asset_mapping = {ticker: Asset(ticker) for ticker in tickers}
        last_transaction = len(self.transactions)

        for _, row in df.iterrows():
            if row['Action'] == 'Deposit':
                self.deposit(row['Cost'], currency=self.currency, date=row['Date'])
            elif row['Action'] == 'Withdrawal':
                self.withdraw(-row['Cost'], currency=self.currency, date=row['Date'])
            elif row['Action'] == 'Buy':
                self.buy(asset_mapping[row['Ticker']], shares=row['Quantity'], value=row['Cost'], date=row['Date'], currency=self.currency)
            elif row['Action'] == 'Sell':
                self.sell(asset_mapping[row['Ticker']], shares=-row['Quantity'], value=-row['Cost'], date=row['Date'], currency=self.currency)

        return self.transactions[last_transaction:]

    @property
    def stats(self) -> dict:
        """Calculate and return comprehensive portfolio statistics."""
        def round_number(value, is_currency=False):
            """Helper function to round numbers consistently"""
            if pd.isna(value):
                return 0.
            decimals = 2 if is_currency else 3
            return round(float(value), decimals)

        # Returns & Performance Metrics
        returns = self.returns
        empty = returns.empty
        log_returns = np.log1p(returns)
        ann_factor = self.ann_factor

        performance_metrics = {
            'total_returns': round_number(np.exp(log_returns.sum()) - 1) if not empty else 0.,
            'trading_returns': round_number(self.trading_returns),
            'annualized_returns': round_number(ann_rets := (1 + returns.mean()) ** ann_factor - 1 if not empty else 0.),
            'daily_returns': {
                'mean': round_number(returns.mean()) if not empty else 0.,
                'median': round_number(returns.median()) if not empty else 0.,
                'std': round_number(returns.std()) if not empty else 0.,
                'skewness': round_number(stats.skew(returns)) if not empty else 0.,
                'kurtosis': round_number(stats.kurtosis(returns)) if not empty else 0.,
            },
            'best_day': round_number(returns.max()) if not empty else 0.,
            'worst_day': round_number(returns.min()) if not empty else 0.,
            'positive_days': round_number((returns > 0).sum() / len(returns)) if not empty else 0.,
        }

        # Risk Metrics
        daily_rf = self.r / ann_factor
        mean_excess_returns = (returns - daily_rf).mean() * ann_factor
        dd = float(np.sqrt(np.mean(np.minimum(returns, 0) ** 2))) if not empty else 0.
        market = self.market.daily['rets'].reindex(returns.index)
        value = self.get_value()
        volatility = returns.std() * np.sqrt(ann_factor)

        risk_metrics = {
            'volatility': round_number(volatility) if not empty else 0.,
            'sharpe_ratio': round_number(mean_excess_returns / volatility) if volatility != 0 else 0.,
            'sortino_ratio': round_number(mean_excess_returns / (dd * np.sqrt(ann_factor))) if (dd * np.sqrt(ann_factor)) != 0 else 0.,
            'beta': round_number(beta := self.beta),
            'value_at_risk': round_number(np.abs(returns.quantile(0.05) * value), True) if not empty else 0.,
            'tracking_error': round_number(tracking_error := np.std(returns - market)) if not empty else 0.,
            'information_ratio': round_number(np.mean(returns - market) / tracking_error) if not empty else 0.,
            'treynor_ratio': round_number(mean_excess_returns / beta) if beta != 0 else 0.,
        }

        # Drawdown Metrics 
        cum_rets = (1 + returns).cumprod()
        df = self.drawdown_df
        drawdowns = self.drawdowns
        min_depth = df['depth'].quantile(0.95) if not df.empty else 0.

        drawdown_metrics = {
            'max_drawdown': round_number(max_dd := (cum_rets / cum_rets.cummax() - 1).min() if not empty else 0.),
            'longest_drawdown_duration': self.longest_drawdown_duration,
            'average_drawdown': round_number(avg_dd := drawdowns[drawdowns < 0].mean() if not empty else 0.),
            'average_drawdown_duration': round_number(
                df[(df['duration'] >= 3) & (-df['depth'] >= np.abs(min_depth))]['duration'].mean()
            ) if not df.empty else 0.,
            'time_to_recovery': round_number(
                df[(df['duration'] >= 3) & (-df['depth'] >= np.abs(min_depth))]['time_to_recovery'].mean()
            ) if not df.empty else 0.,
            'drawdown_ratio': round_number(max_dd / avg_dd) if not empty else 0.,
            'calmar_ratio': round_number(ann_rets / np.abs(max_dd)) if max_dd != 0 else 0.,
        }

        # Position & Exposure Metrics
        weights = self.weights
        position_metrics = {
            'total_value': round_number(value, True),
            'cash': round_number(self.cash, True),
            'cash_weight': round_number(self.cash / value) if value != 0 else 0,
            'number_of_positions': len(self.holdings),
            'largest_position': round_number(max(weights.values()) if weights else 0),
            'smallest_position': round_number(min(weights.values()) if weights else 0),
            'concentration': round_number(sum(w * w for w in weights.values())),
        }

        # Trading Activity Metrics
        net_deposits = self.net_deposits
        buys = [t for t in self.transactions if t.type == 'BUY']
        sells = [t for t in self.transactions if t.type == 'SELL']
        profits = [t.profit for t in sells if t.profit > 0]
        losses = [t.profit for t in sells if t.profit < 0]

        activity_metrics = {
            'realized_pnl': round_number(r_pnl := self.realized_pnl, True),
            'unrealized_pnl': round_number(u_pnl := self.unrealized_pnl, True),
            'total_pnl': round_number(r_pnl + u_pnl, True),
            'investment_pnl': round_number(value - net_deposits, True),
            'net_deposits': round_number(net_deposits, True),
            'number_of_trades': len(buys) + len(sells),
            'win_rate': round_number(len([t for t in sells if t.profit > 0]) / len(sells)) if sells else 0.,
            'profit_factor': round_number(sum(profits) / abs(sum(losses))) if sum(losses) != 0 else 0.,
            'average_win_loss_ratio': round_number(np.mean(profits) / np.mean(np.abs(losses))) if np.mean(np.abs(losses)) != 0 else 0.,
        }

        return {
            'performance': performance_metrics,
            'risk': risk_metrics,
            'drawdown': drawdown_metrics,
            'position': position_metrics,
            'activity': activity_metrics,
        }

    @property
    def profit_factor(self) -> float:
        sells = [t for t in self.transactions if t.type == 'SELL']
        profits = sum(t.profit for t in sells if t.profit > 0)
        losses = sum(t.profit for t in sells if t.profit < 0)
        return float(profits / abs(losses)) if losses != 0 else 0

    @property
    def average_win_loss_ratio(self) -> float:
        sells = [t for t in self.transactions if t.type == 'SELL']
        profits = [t.profit for t in sells if t.profit > 0]
        losses = [abs(t.profit) for t in sells if t.profit < 0]
        return float(np.mean(profits) / np.mean(losses)) if losses else 0

    @property
    def information_ratio(self) -> float:
        market = self.market.daily['rets'].reindex(self.returns.index)
        active_returns = self.returns - market
        return float(np.mean(active_returns) / self.tracking_error) if self.tracking_error != 0 else 0

    @property
    def treynor_ratio(self) -> float:
        returns = self.returns
        if returns.empty:
            return 0
        daily_rf = self.r / self.ann_factor
        excess_returns = returns - daily_rf
        mean_excess_returns = excess_returns.mean() * self.ann_factor
        return float(mean_excess_returns / self.beta) if self.beta != 0 else 0

    @property
    def tracking_error(self) -> float:
        returns = self.returns
        if returns.empty:
            return 0
        market = self.market.daily['rets'].reindex(self.returns.index)
        return round(float(np.std(returns - market)), 3)

    @property
    def win_rate(self) -> float:
        sells = [t for t in self.transactions if t.type == 'SELL']
        if not sells:
            return 0
        return len([t for t in sells if t.profit > 0]) / len(sells)

    @property
    def total_returns(self) -> float:
        log_returns = self.log_returns
        if log_returns.empty:
            return 0
        return float(np.exp(log_returns.sum()) - 1)

    @property
    def trading_returns(self) -> float:
        """Trading return as a decimal: trading P&L divided by cost basis."""
        total_cost_basis = sum(self.holdings[ast] * self.cost_bases[ast] for ast in self.assets)
        return float(self.trading_pnl() / total_cost_basis) if total_cost_basis else 0.0

    def _returns_helper(self) -> tuple[pd.Series, pd.Series, pd.Series]:

        if not self.transactions:
            return pd.Series(), pd.Series(), pd.Series()

        # Sort transactions by date
        sorted_transactions = sorted(self.transactions, key=lambda x: x.date)

        # Create a DataFrame of holdings changes
        holdings_changes = {}
        current_holdings = defaultdict(float)
        running_deposit = defaultdict(float)
        cash = defaultdict(float)

        has_crypto = False
        for t in sorted_transactions:
            if type(t.asset) != str:
                if t.asset.asset_type == 'Cryptocurrency':
                    has_crypto = True
            if t.type == 'BUY':
                current_holdings[t.asset] += t.shares
                cash[t.date] -= t.value
            elif t.type == 'SELL':
                current_holdings[t.asset] -= t.shares
                cash[t.date] += t.value
            elif t.type == 'DEPOSIT':
                running_deposit[t.date] += t.value
                cash[t.date] += t.value
            elif t.type == 'WITHDRAW':
                running_deposit[t.date] -= t.value
                cash[t.date] -= t.value
            holdings_changes[t.date[:10]] = dict(current_holdings)

        running_deposit = pd.Series(running_deposit)
        cash = pd.Series(cash)
        running_deposit.index = pd.to_datetime(running_deposit.index)
        cash.index = pd.to_datetime(cash.index)

        # Convert to DataFrame and forward fill
        holdings_df = pd.DataFrame.from_dict(holdings_changes, orient='index').fillna(0)
        holdings_df.index = pd.to_datetime(holdings_df.index)
        if holdings_df.empty:
            earliest_date = min(cash.index[0], running_deposit.index[0])
        else:
            earliest_date = min(cash.index[0], running_deposit.index[0], holdings_df.index[0])
        holdings_df = holdings_df.reindex(
            pd.date_range(start=earliest_date.date(), end=pd.Timestamp.today(), freq=('D' if has_crypto else 'B'))
        ).ffill()

        running_deposit = running_deposit.reindex(holdings_df.index).fillna(0).cumsum()
        cash = cash.reindex(holdings_df.index).fillna(0).cumsum()


        prices = pd.DataFrame(index=holdings_df.index)
        for ast in holdings_df.columns:
            prices[ast] = ast.daily['adj_close']
        prices = prices.ffill()

        portfolio_values = holdings_df.mul(prices).sum(axis=1)

        return running_deposit, cash, portfolio_values

    @property
    def pnls(self) -> pd.Series:
        deps, cash, values = self._returns_helper()
        return (values + cash - deps).diff()

    @property
    def returns(self) -> pd.Series:
        deps, cash, values = self._returns_helper()
        rets = (values + cash) / deps
        return rets.pct_change().dropna()

    @property
    def log_returns(self) -> pd.Series:
        rets = self.returns
        return np.log1p(rets)
    
    def pnl_chart(self) -> go.Figure | None:
        pnl = self.pnls
        if pnl.empty:
            return None
        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=pnl.index, 
                y=pnl.cumsum(), 
                mode='lines', 
                name='PnL'
            )
        )
        fig.update_layout(
            xaxis=dict(
                gridcolor='rgba(128, 128, 128, 0.2)',
                zeroline=False,
            ), 
            yaxis=dict(
                gridcolor='rgba(128, 128, 128, 0.2)',
                title='PnL',
                zeroline=False,
            ),
            paper_bgcolor='rgba(0, 0, 0, 0)',
            plot_bgcolor='rgba(0, 0, 0, 0)',
            font=dict(color='white'),
            hovermode='x'
        )
        
        return fig
    
    def returns_chart(self) -> go.Figure | None:
        rets = self.log_returns
        if rets.empty:
            return None
        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=rets.index, 
                y=np.exp(rets.cumsum()), 
                mode='lines',
                name='Returns'
            )
        )
        fig.update_layout(
            xaxis=dict(
                gridcolor='rgba(128, 128, 128, 0.2)',
            ), 
            yaxis=dict(
                gridcolor='rgba(128, 128, 128, 0.2)',
                title='Returns'
            ),
            paper_bgcolor='rgba(0, 0, 0, 0)',
            plot_bgcolor='rgba(0, 0, 0, 0)',
            font=dict(color='white'),
            hovermode='x'
        )
        
        return fig

    @property
    def realized_pnl(self) -> float:
        """Profit from sold shares: (sale proceeds) - (cost basis of sold shares)."""
        return sum(t.profit for t in self.transactions if t.type == 'SELL')

    @property
    def unrealized_pnl(self) -> float:
        """Profit from current holdings: (current value) - (cost basis of remaining shares)."""
        return sum(self.holdings_pnl().values())

    def trading_pnl(self) -> float:
        """Total trading P&L: realized + unrealized."""
        return self.realized_pnl + self.unrealized_pnl

    @property
    def net_deposits(self) -> float:
        return sum(t.value for t in self.transactions if t.type == 'DEPOSIT') - sum(t.value for t in self.transactions if t.type == 'WITHDRAW')

    def investment_pnl(self, date: DateLike | None = None) -> float:
        """Total portfolio PnL at date"""
        date = self._parse_date(date)[:10]
        curr_value = self.get_value(date)
        return float(curr_value - self.net_deposits)

    def get_value(self, date: DateLike | None = None) -> float:
        """Portfolio market value at date"""
        date = self._parse_date(date)
        return float(sum(self.holdings_value(date).values()) + self.cash)

    def holdings_pnl(self, date: DateLike | None = None) -> dict:
        """PnL in absolute currency of each holdings at date"""
        date = self._parse_date(date)
        date = date.strftime('%Y-%m-%d') if type(date) != str else date[:10]
        value = self.holdings_value(date)
        return {ast: float(value[ast] - (self.holdings[ast] * self.cost_bases[ast]))
                for ast in self.assets}

    def holdings_returns(self, date: DateLike | None = None) -> dict:
        """Returns in decimals of each holdings at date"""
        date = self._parse_date(date)
        date = date.strftime('%Y-%m-%d') if type(date) != str else date[:10]
        pnl = self.holdings_pnl(date)
        return {ast: float(pnl[ast] / (self.holdings[ast] * self.cost_bases[ast]))
                for ast in self.assets}

    def holdings_value(self, date: DateLike | None = None) -> dict:
        """Market value of each holdings at date"""
        date = self._parse_date(date)[:10]

        return {asset: float(self._get_price(asset, date) * shares)
                for asset, shares in self.holdings.items()}

    @property
    def ann_factor(self) -> int:
        stock_weight = sum(v for k, v in self.weights.items() if k.asset_type != 'Cryptocurrency')
        crypto_weight = sum(v for k, v in self.weights.items() if k.asset_type == 'Cryptocurrency')
        ann_factor = (stock_weight * 252) + (crypto_weight * 365)
        return ann_factor if ann_factor else 252

    @property
    def volatility(self) -> float:
        if not self.holdings:
            return 0
        returns = self.returns
        if returns.empty:
            return 0
        daily_vol = returns.std()
        return float(daily_vol * np.sqrt(self.ann_factor))

    @property
    def annualized_returns(self) -> float:
        returns = self.returns
        if returns.empty:
            return 0
        return float((1 + returns.mean()) ** self.ann_factor - 1)

    @property
    def downside_deviation(self) -> float:
        returns = self.returns
        if returns.empty:
            return 0
        return float(np.sqrt(np.mean(np.minimum(returns, 0) ** 2)))

    @property
    def sortino_ratio(self) -> float:
        if not self.holdings:
            return 0

        downside_deviation = self.downside_deviation
        if downside_deviation == 0:
            return 0

        ann_factor = self.ann_factor

        # Convert annual risk-free rate to daily using weighted factor
        daily_rf = self.r / ann_factor

        # Calculate excess returns
        excess_returns = self.returns - daily_rf

        # Annualize mean excess returns
        mean_excess_returns = excess_returns.mean() * ann_factor
        return float(mean_excess_returns / (downside_deviation * np.sqrt(ann_factor)))

    @property
    def weights(self) -> dict:
        holdings_value = self.holdings_value()
        return {k: v / sum(holdings_value.values()) for k, v in holdings_value.items()}

    @property
    def sharpe_ratio(self) -> float:

        if not self.weights:
            return 0

        ann_factor = self.ann_factor

        # Convert annual risk-free rate to daily using weighted factor
        daily_rf = self.r / ann_factor

        # Calculate excess returns
        excess_returns = self.returns - daily_rf

        # Annualize mean excess returns
        mean_excess_returns = excess_returns.mean() * ann_factor

        vol = self.volatility
        if vol == 0:
            return 0

        return float(mean_excess_returns / vol)

    @property
    def beta(self) -> float:
        market = self.market
        df = pd.DataFrame(index=pd.date_range(start='2020-01-01', end=pd.Timestamp.today()))
        has_crypto = False
        df['market'] = market.daily['log_rets']
        for ast in self.assets:
            df[ast] = ast.daily['log_rets']
            if ast.asset_type == 'Cryptocurrency':
                has_crypto = True

        df = df.ffill() if has_crypto else df.dropna()

        df = df.dropna().resample('ME').agg('sum')
        df = np.exp(df)

        betas = {}
        market_var = df['market'].var()
        for col in df.columns:
            if str(col) == 'market':
                continue
            beta = df[col].cov(df['market']) / market_var
            betas[col] = float(beta)

        weights = self.weights
        return sum(weights[ast] * betas[ast] for ast in self.assets)

    def VaR(self, confidence: float = 0.95) -> float:
        returns = self.returns
        if returns.empty:
            return 0
        return float(np.abs(returns.quantile(1 - confidence) * self.get_value()))

    def correlation_matrix(self) -> go.Figure | None:
        if len(self.assets) < 2:
            return None
        df = pd.DataFrame()
        for ast in self.assets:
            df[ast.ticker] = ast.daily['rets']

        corr_matrix = df.corr()
        
        # Create mask for upper triangle
        mask = np.zeros_like(corr_matrix, dtype=bool)
        mask[np.triu_indices_from(mask, k=1)] = True
        
        # Set upper triangle to None or NaN which Plotly treats as transparent
        corr_matrix_masked = corr_matrix.copy()
        corr_matrix_masked[mask] = np.nan

        fig = go.Figure(data=go.Heatmap(
            z=corr_matrix_masked,
            x=corr_matrix.columns,
            y=corr_matrix.columns,
            zmin=-1,
            zmax=1,
            colorscale='RdBu',
            hoverongaps=False
        ))

        # Update layout
        fig.update_layout(
            xaxis=dict(
                tickangle=-90,
                side='bottom',
                showgrid=False,
            ),
            yaxis=dict(
                autorange='reversed',
                showgrid=False,
            ),
            paper_bgcolor='rgba(0, 0, 0, 0)',
            plot_bgcolor='rgba(0, 0, 0, 0)',
            font=dict(color='white')
        )
        
        return fig

    def risk_decomposition(self)  -> go.Figure | None:
        if len(self.assets) < 2:
            return None
        df = pd.DataFrame()
        port_weights = self.weights
        weights = []
        for ast in self.assets:
            df[ast] = ast.daily['rets']
            weights.append(port_weights[ast])
        weights = np.array(weights)

        cov = df.cov() * self.ann_factor
        port_vol = np.sqrt(weights.T @ cov @ weights)
        marginal_risk = (cov @ weights) / port_vol
        component_risk = marginal_risk * weights
        risk_contribution = component_risk / port_vol * 100

        # Create the data as a dictionary first
        data = {
            'Weight': weights,
            'Risk Contribution': risk_contribution,
            'Marginal Risk': marginal_risk,
            'Component Risk': component_risk
        }

        # Create DataFrame all at once with the assets as index
        risk_decomp = pd.DataFrame(data, index=self.assets)
        risk_decomp = risk_decomp.sort_values('Weight', ascending=False)

        fig = make_subplots(
            rows=1, cols=2,
            subplot_titles=('Portfolio Weight vs Risk Contribution', 'Marginal Risk'),
            # vertical_spacing=0.2,
            # row_heights=[0.7, 0.3]
        )

        # Create a color map for assets
        colors = px.colors.sequential.RdBu_r
        asset_colors = {ast.ticker: colors[i % len(colors)] for i, ast in enumerate(risk_decomp.index)}

        # Add traces for top subplot (stacked)
        for ast in risk_decomp.index:
            # Add weight bar
            fig.add_trace(
                go.Bar(
                    name=ast.ticker,
                    x=['Portfolio Weight'],
                    y=[risk_decomp.loc[ast, 'Weight'] * 100],
                    marker_color=asset_colors[ast.ticker],
                    width=0.5,
                    hovertemplate="<br>".join([
                        "<b>%{x}</b>",
                        f"Asset: {ast.ticker}",
                        "Weight: %{y:.1f}%",
                        "<extra></extra>"
                    ])
                ),
                row=1, col=1
            )

            # Add risk contribution bar
            fig.add_trace(
                go.Bar(
                    name=ast.ticker,
                    x=['Risk Contribution'],
                    y=[risk_decomp.loc[ast, 'Risk Contribution']],
                    marker_color=asset_colors[ast.ticker],
                    showlegend=False,
                    width=0.5,
                    hovertemplate="<br>".join([
                        "<b>%{x}</b>",
                        f"Asset: {ast.ticker}",
                        "Contribution: %{y:.1f}%",
                        "<extra></extra>"
                    ])
                ),
                row=1, col=1
            )

            # Add marginal risk bar (bottom subplot)
            fig.add_trace(
                go.Bar(
                    name=ast.ticker,
                    x=[ast.ticker],
                    y=[risk_decomp.loc[ast, 'Marginal Risk']],
                    marker_color=asset_colors[ast.ticker],
                    showlegend=False,
                    width=0.5,
                    hovertemplate="<br>".join([
                        f"Asset: {ast.ticker}",
                        "Marginal Risk: %{y:.4f}",
                        "<extra></extra>"
                    ])
                ),
                row=1, col=2
            )

        # Update layout
        fig.update_layout(
            barmode='stack',
            showlegend=False,
            # height=800,
            # title_text="Portfolio Risk Analysis",
            paper_bgcolor='rgba(0, 0, 0, 0)',
            plot_bgcolor='rgba(0, 0, 0, 0)',
            font=dict(color='white'),
            yaxis=dict(
                gridcolor='rgba(128, 128, 128, 0.2)',
                range=[0, 105],
                title='Percentage (%)'
            ),
            yaxis2=dict(
                gridcolor='rgba(128, 128, 128, 0.2)',
                title='Marginal Risk'
            ),
            xaxis2=dict(
                tickangle=-90
            )

        )

        # Update y-axes labels
        # fig.update_yaxes(title_text="Percentage (%)", range=[0, 105], row=1, col=1)
        # fig.update_yaxes(title_text="Marginal Risk", row=1, col=2)

        # Update x-axis for bottom subplot
        # fig.update_xaxes(title_text="Assets", row=1, col=1)

        

        return fig

    @property
    def max_drawdown(self) -> float:
        returns = self.returns
        if returns.empty:
            return 0
        cum_rets = (1 + returns).cumprod()
        max_dd = (cum_rets / cum_rets.cummax() - 1).min()
        return float(max_dd)

    @property
    def drawdowns(self) -> pd.Series:
        cum_rets = (1 + self.returns).cumprod()
        drawdown = (cum_rets / cum_rets.cummax() - 1)
        return drawdown.dropna()

    @property
    def longest_drawdown_duration(self) -> dict:
        df = self.drawdown_df
        if df.empty:
            return {'start': None, 'end': None, 'duration': 0}
        longest = df['duration'].idxmax()
        longest_start = df.loc[longest, 'start']
        longest_end = df.loc[longest, 'recovery'] if pd.notna(df.loc[longest, 'recovery']) else pd.Timestamp.today()
        longest_duration = int(df.loc[longest, 'duration'])
        return {'start': longest_start.strftime('%d-%m-%Y'), 'end': longest_end.strftime('%d-%m-%Y'), 'duration': longest_duration}

    @property
    def average_drawdown(self) -> float:
        drawdown = self.drawdowns[self.drawdowns < 0]
        return float(drawdown.mean()) if not drawdown.empty else 0
    
    @property
    def drawdown_ratio(self) -> float:
        return (self.max_drawdown / self.average_drawdown) if self.average_drawdown != 0 else 0

    def time_to_recovery(self, min_duration: int = 3, significance: float = 0.05) -> float:
        df = self.drawdown_df.dropna()
        if df.empty:
            return 0
        min_depth = df['depth'].quantile(1-significance)
        return float(df[(df['duration'] >= min_duration) & (-df['depth'] >= np.abs(min_depth))]['time_to_recovery'].mean())

    def average_drawdown_duration(self, min_duration: int = 3, significance: float = 0.05) -> float:
        df = self.drawdown_df
        if df.empty:
            return 0
        min_depth = df['depth'].quantile(1-significance)
        return float(df[(df['duration'] >= min_duration) & (-df['depth'] >= np.abs(min_depth))]['duration'].mean())

    def drawdown_frequency(self, bins: int = 20) -> go.Figure | None:
        df = self.drawdown_df
        if df.empty:
            return None
        troughs = df['depth']
        bins = np.linspace(troughs.min(), troughs.max(), bins + 1)

        fig = go.Figure()
        fig.add_trace(
            go.Histogram(
            x=troughs, 
            xbins=dict(
                start=bins[0], 
                end=bins[-1], 
                size=(bins[1] - bins[0])
                ),
            name='Drawdown Frequency'
            )
        )

        fig.update_layout(
            xaxis_title='Drawdown Depth',
            yaxis_title='Frequency',
            yaxis=dict(
                    range=[0, None],
                    rangemode='nonnegative',
                    gridcolor='rgba(128, 128, 128, 0.2)',
                ),
            bargap=0.05,
            paper_bgcolor='rgba(0, 0, 0, 0)',
            plot_bgcolor='rgba(0, 0, 0, 0)',
            font=dict(color='white'),
        )
        

        return fig

    @property
    def drawdown_df(self) -> pd.DataFrame:
        drawdown_series = self.drawdowns
        # Initialize variables
        in_drawdown = False
        drawdown_start = None
        bottom_date = None
        current_bottom = 0
        recovery_periods = []

        for date, dd in drawdown_series.items():
            # New drawdown starts
            if not in_drawdown and dd < 0:
                in_drawdown = True
                drawdown_start = date
                bottom_date = date
                current_bottom = dd

            # During drawdown
            elif in_drawdown:
                # Update bottom if we go lower
                if dd < current_bottom:
                    bottom_date = date
                    current_bottom = dd

                # Recovery found
                if dd == 0:
                    recovery_date = date
                    in_drawdown = False
                    recovery_periods.append({
                        'start': drawdown_start,
                        'bottom': bottom_date,
                        'recovery': recovery_date,
                        'depth': current_bottom,
                        'time_to_recovery': (recovery_date - bottom_date).days,
                        'duration': (recovery_date - drawdown_start).days
                    })

        # If still in drawdown at end of series
        if in_drawdown:
            recovery_periods.append({
                'start': drawdown_start,
                'bottom': bottom_date,
                'recovery': None,
                'depth': current_bottom,
                'time_to_recovery': None,
                'duration': (date - drawdown_start).days
            })

        return pd.DataFrame(recovery_periods)

    @property
    def calmar_ratio(self) -> float:
        return float(self.annualized_returns / np.abs(self.max_drawdown)) if self.max_drawdown != 0 else 0

    @property
    def drawdown_metrics(self) -> dict:

        metrics = {
            'max_drawdown': self.max_drawdown,
            'average_drawdown': self.average_drawdown,
            'drawdown_ratio': self.drawdown_ratio,
            'longest_drawdown': self.longest_drawdown_duration,
            'time_to_recovery': self.time_to_recovery(),
            'average_drawdown_duration': self.average_drawdown_duration(),
            'calmar_ratio': self.calmar_ratio
        }

        return metrics
    
    def drawdown_plot(self) -> go.Figure | None:
        dd = self.drawdowns
        if dd.empty:
            return None

        fig = go.Figure()

        fig.add_trace(
            go.Scatter(
                x=dd.index,
                y=dd,
                mode='lines',
                name='Drawdown'
            )
        )

        fig.update_layout(
            xaxis=dict(
                gridcolor='rgba(128, 128, 128, 0.2)',
                zeroline=False,
            ),
            yaxis=dict(
                title='Drawdown',
                gridcolor='rgba(128, 128, 128, 0.2)',
                zeroline=False,
            ),
            showlegend=False,
            paper_bgcolor='rgba(0, 0, 0, 0)',
            plot_bgcolor='rgba(0, 0, 0, 0)',
            font=dict(color='white'),
            hovermode='x'
        )

        return fig

    def save(self):
        state = {
            'holdings': {k.ticker: v for k, v in self.holdings.items()},
            'cost_bases': {k.ticker: v for k, v in self.cost_bases.items()},
            'assets': [ast.ticker for ast in self.assets],
            'cash': self.cash,
            'r': self.r,
            'currency': self.currency,
            'id': self.id,
        }

        json_transactions = []
        for t in self.transactions:
            t = t._asdict()
            if isinstance(t['asset'], Asset):
                t['asset'] = t['asset'].ticker
            t['id'] = str(t['id'])
            json_transactions.append(t)

        return state, json_transactions


    @classmethod
    def load(cls, state, transactions):
        port = cls(currency=state['currency'], r=state['r'])

        # update state
        port.cash = state['cash']
        port.id = state['id']
        port.assets = [Asset(ast) for ast in state['assets']]

        for ast in port.assets:
            del ast.five_minute
            if ast.currency != port.currency:
                port._convert_ast(ast)

        holdings = state['holdings']
        port.holdings.update({ast: holdings[ast.ticker] for ast in port.assets})

        tickers = [ast.ticker for ast in port.assets]
        for ticker in state['cost_bases']:
            if ticker in tickers:
                idx = tickers.index(ticker)
                port.cost_bases[port.assets[idx]] = state['cost_bases'][ticker]
            else:
                ast = Asset(ticker)
                if ast.currency != port.currency:
                    port._convert_ast(ast)
                port.cost_bases[ast] = state['cost_bases'][ticker]

        # update transactions
        asset_mapping = {ast.ticker: ast for ast in port.cost_bases.keys()}
        t_list = []
        for t in transactions:
            t = t.model_dump()
            ast = asset_mapping.get(t['asset'], 'Cash')
            t = transaction(t['type'], ast, t['shares'], t['value'], t['profit'], t['date'], t['id'])
            t_list.append(t)

        port.transactions = t_list

        return port

    @classmethod
    def report(cls, name):
        pass

# TODO:
# make unique id for portfolio
# add vanguard lifestrategy mappings
