import numpy as np
import pandas as pd
from assets import Asset
from collections import Counter, defaultdict, namedtuple
import psycopg as pg
from config import DB_CONFIG
import datetime
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from scipy import stats
import json

DateLike = str | datetime.datetime | datetime.date | pd.Timestamp

# store how many shares e.g. NVDA 30 shares
# buy/sell: give date and either shares or price
# Portfolio({AAPL: {'shares': 20, 'avg_price': 100}, NVDA: {'shares': 15, 'avg_price': 20}})
# store total money invested and num of shares for each asset


class Portfolio:

    transaction = namedtuple('transaction', ['type', 'asset', 'shares', 'value', 'profit', 'date', 'id'])

    def __init__(self, assets: dict | None = None, currency: str | None = None, r: float = 0.02):
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
            self.assets.extend([Asset(ast.ticker) for ast in assets.keys()])  # store copy of assets

            if currency is None:
                self.currency = Counter((ast.currency for ast in assets)).most_common()[0][0]
            else:
                self.currency = currency

            if self.currency != 'USD':
                self._convert_ast(self.market)

            for ast in self.assets:
                del ast.five_minute
                if ast.currency != self.currency:
                    self._convert_ast(ast)

            for ast in self.assets:
                self.holdings[ast] = assets[ast]['shares']
                if ast.currency != self.currency:
                    avg_price = self._convert_price(assets[ast]['avg_price'], ast.currency)
                else:
                    avg_price = assets[ast]['avg_price']

                self.cost_bases[ast] = avg_price
            self.cash = assets.get('Cash', 0)

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
            with pg.connect(**DB_CONFIG) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT currency_pair, date, close FROM daily_forex WHERE currency_pair = %s", (key,))
                    forex = cur.fetchall()

            forex = pd.DataFrame(forex, columns=['pair', 'date', 'close']).set_index('date')
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

    def deposit(self, value: float, currency: str | None = None, date: DateLike | None = None):
        date = self._parse_date(date)

        if currency != self.currency:
            value = self._convert_price(value, currency, date)
        value = round(float(value), 2)

        self.transactions.append(self.transaction('DEPOSIT', 'Cash', 0.0, value, 0., date, self.id))
        self.cash += value
        self.id += 1

    def withdraw(self, value: float, currency: str | None = None, date: DateLike | None = None):
        date = self._parse_date(date)

        if currency != self.currency:
            value = self._convert_price(value, currency, date)
        value = round(float(value), 2)

        if self.cash - value < 0:
            raise ValueError('Not enough money')

        self.transactions.append(self.transaction('WITHDRAW', 'Cash', 0.0, value, 0., date, self.id))
        self.cash -= value
        self.id += 1

    def buy(self, asset: Asset, *, shares: float | None = None, value: float | None = None, 
            date: DateLike | None = None, currency: str | None = None) -> None:

        date = self._parse_date(date)

        if currency is None:
            currency = asset.currency

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

        self.transactions.append(self.transaction('BUY', ast, round(float(shares), 5), value, 0., date, self.id))
        old_cost_basis = self.cost_bases[ast] * self.holdings[ast]
        self.holdings[ast] += float(shares)
        self.cost_bases[ast] = (old_cost_basis + value) / self.holdings[ast]
        self.cash -= value
        self.id += 1

    def sell(self, asset: Asset, *, shares: float | None = None, value: float | None = None, 
            date: DateLike | None = None, currency: str | None = None) -> None:

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
        self.transactions.append(self.transaction('SELL', ast, round(float(shares), 5), value, round(float(profit), 2), date, self.id))

        self.holdings[ast] -= float(shares)
        self.cash += value
        if self.holdings[ast] < 1e-8:
            del self.holdings[ast]
            del self.assets[idx]
        self.id += 1

    def pie_chart(self, data: dict, title: str):
        fig = go.Figure()

        # Create custom text array - empty string for small values
        text = [f'{p*100:.1f}%' if p >= 0.05 else '' for p in data.values()]

        fig.add_trace(go.Pie(
            labels=list(data.keys()),
            values=list(data.values()),
            text=text,
            textinfo='text',
            hoverinfo='label+percent',
            textposition='auto',
        ))

        fig.update_layout(
            title=title,
            showlegend=True,
            legend=dict(
                orientation="v",
                yanchor="middle",
                y=0.5,
                xanchor="right",
                x=1
            )
        )

        fig.show()
        return fig

    def holdings_chart(self):
        weights = self.weights
        data = {k.ticker: v for k, v in weights.items()}
        return self.pie_chart(data, 'Portfolio Holdings')

    def asset_type_exposure(self):
        data = defaultdict(float)
        weights = self.weights
        for ast, weight in weights.items():
            data[ast.asset_type] += weight

        return self.pie_chart(data, 'Asset Type Exposure')

    def sector_exposure(self):
        data = defaultdict(float)
        weights = self.weights
        for ast, weight in weights.items():
            if ast.sector is not None:
                data[ast.sector] += weight

        data = {k: v / sum(data.values()) for k, v in data.items()}

        return self.pie_chart(data, 'Sector Exposure')

    def returns_dist(self, bins: int = 100, show_stats: bool = True):
        data = self.returns.dropna()
        fig = go.Figure()

        # Calculate statistics
        stats_text = (
            f'Mean: {np.mean(data):.4f}<br>'
            f'Std Dev: {np.std(data):.4f}<br>'
            f'Skewness: {stats.skew(data):.4f}<br>'
            f'Kurtosis: {stats.kurtosis(data):.4f}'
        )

        bins = np.linspace(data.min(), data.max(), bins + 1)

        fig.add_trace(
            go.Histogram(
                x=data,
                xbins=dict(
                    start=bins[0],
                    end=bins[-1],
                    size=(bins[1] - bins[0])
                ),
                name='Portfolio Returns Distribution'
            )
        )

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
                bargap=0.05,
                title='Portfolio Returns Distribution',
                xaxis_title='Returns',
                yaxis_title='Count'
            )

        fig.show()

        return fig

    def rebalance(self, target_weights: dict, inplace: bool = False):
        for ast in target_weights:
            if ast not in self.assets:
                raise ValueError(f'Asset {ast} not in portfolio')

        if not inplace:
            new_port = Portfolio({ast: {'shares': self.holdings[ast], 'avg_price': self.cost_bases[ast]} for ast in self.assets})
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

    def from_212(self, filename: str):
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

        for _, row in df.iterrows():
            if row['action'] == 'buy':
                self.buy(asset_mapping[row['ticker']], shares=row['shares'], value=row['value'], date=row['time'], currency=self.currency)
            elif row['action'] == 'sell':
                self.sell(asset_mapping[row['ticker']], shares=row['shares'], value=row['value'], date=row['time'], currency=self.currency)
            elif row['action'] == 'deposit':
                self.deposit(row['value'], currency=self.currency, date=row['time'])

    def from_vanguard(self, filename: str):
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

        for _, row in df.iterrows():
            if row['Action'] == 'Deposit':
                self.deposit(row['Cost'], currency=self.currency, date=row['Date'])
            elif row['Action'] == 'Withdrawal':
                self.withdraw(-row['Cost'], currency=self.currency, date=row['Date'])
            elif row['Action'] == 'Buy':
                self.buy(asset_mapping[row['Ticker']], shares=row['Quantity'], value=row['Cost'], date=row['Date'], currency=self.currency)
            elif row['Action'] == 'Sell':
                self.sell(asset_mapping[row['Ticker']], shares=-row['Quantity'], value=-row['Cost'], date=row['Date'], currency=self.currency)

    @property
    def stats(self):
        """Calculate and return comprehensive portfolio statistics."""
        def round_number(value, is_currency=False):
            """Helper function to round numbers consistently"""
            if pd.isna(value):
                return value
            decimals = 2 if is_currency else 3
            return round(float(value), decimals)

        # Returns & Performance Metrics
        performance_metrics = {
            'total_return': round_number(self.total_returns),
            'trading_return': round_number(self.trading_returns),
            'annualized_return': round_number(self.annualized_returns),
            'daily_returns': {
                'mean': round_number(self.returns.mean()),
                'median': round_number(self.returns.median()),
                'std': round_number(self.returns.std()),
                'skewness': round_number(stats.skew(self.returns.dropna())),
                'kurtosis': round_number(stats.kurtosis(self.returns.dropna())),
            },
            'best_day': round_number(self.returns.max()),
            'worst_day': round_number(self.returns.min()),
            'positive_days': round_number((self.returns > 0).sum() / len(self.returns)),
        }

        # Risk Metrics
        risk_metrics = {
            'volatility': round_number(self.volatility),
            'sharpe_ratio': round_number(self.sharpe_ratio),
            'sortino_ratio': round_number(self.sortino_ratio),
            'beta': round_number(self.beta),
            'value_at_risk': round_number(self.VaR(), True),
            'tracking_error': round_number(self.tracking_error),
            'information_ratio': round_number(self.information_ratio),
            'treynor_ratio': round_number(self.treynor_ratio),
        }

        # Drawdown Metrics 
        drawdown_metrics = {
            'max_drawdown': round_number(self.max_drawdown),
            'average_drawdown': round_number(self.average_drawdown),
            'drawdown_ratio': round_number(self.drawdown_ratio),
            'calmar_ratio': round_number(self.calmar_ratio),
            'longest_drawdown': self.longest_drawdown_duration,
            'time_to_recovery': round_number(self.time_to_recovery()),
            'avg_drawdown_duration': round_number(self.average_drawdown_duration()),
        }

        # Position & Exposure Metrics
        position_metrics = {
            'total_value': round_number(self.get_value(), True),
            'cash': round_number(self.cash, True),
            'cash_weight': round_number(self.cash / self.get_value()),
            'number_of_positions': len(self.holdings),
            'largest_position': round_number(max(self.weights.values()) if self.weights else 0),
            'smallest_position': round_number(min(self.weights.values()) if self.weights else 0),
            'concentration': round_number(sum(w*w for w in self.weights.values())),
        }

        # Trading Activity Metrics
        activity_metrics = {
            'realized_pnl': round_number(self.realized_pnl, True),
            'unrealized_pnl': round_number(self.unrealized_pnl, True),
            'total_pnl': round_number(self.trading_pnl(), True),
            'investment_pnl': round_number(self.investment_pnl(), True),
            'net_deposits': round_number(self.net_deposits, True),
            'number_of_trades': len([t for t in self.transactions if t.type in ['BUY', 'SELL']]),
            'win_rate': round_number(self.win_rate),
        }

        return {
            'performance': performance_metrics,
            'risk': risk_metrics,
            'drawdown': drawdown_metrics,
            'position': position_metrics,
            'activity': activity_metrics,
        }

    @property
    def information_ratio(self):
        market = self.market.daily['rets'].reindex(self.returns.index)
        active_returns = self.returns - market
        return float(np.mean(active_returns) / self.tracking_error) if self.tracking_error != 0 else 0

    @property
    def treynor_ratio(self):
        daily_rf = self.r / self.ann_factor
        excess_returns = self.returns - daily_rf
        mean_excess_returns = excess_returns.mean() * self.ann_factor
        return float(mean_excess_returns / self.beta) if self.beta != 0 else 0

    @property
    def tracking_error(self):
        market = self.market.daily['rets'].reindex(self.returns.index)
        return round(float(np.std(self.returns - market)), 3)

    @property
    def win_rate(self):
        sells = [t for t in self.transactions if t.type == 'SELL']
        if not sells:
            return 0
        return len([t for t in sells if t.profit > 0]) / len(sells)

    @property
    def total_returns(self) -> float:
        return float(np.exp(self.log_returns.sum() - 1))

    @property
    def trading_returns(self) -> float:
        """Trading return as a decimal: trading P&L divided by cost basis."""
        total_cost_basis = sum(self.holdings[ast] * self.cost_bases[ast] for ast in self.assets)
        return float(self.trading_pnl() / total_cost_basis) if total_cost_basis else 0.0

    def _returns_helper(self):

        if not self.transactions:
            return pd.Series()

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
    def pnls(self):
        deps, cash, values = self._returns_helper()
        return (values + cash - deps).diff()

    @property
    def returns(self):
        deps, cash, values = self._returns_helper()
        rets = (values + cash) / deps
        return rets.pct_change().dropna()

    @property
    def log_returns(self):
        rets = self.returns
        return np.log1p(rets)

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
    def net_deposits(self):
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
    def ann_factor(self):
        stock_weight = sum(v for k, v in self.weights.items() if k.asset_type != 'Cryptocurrency')
        crypto_weight = sum(v for k, v in self.weights.items() if k.asset_type == 'Cryptocurrency')
        ann_factor = (stock_weight * 252) + (crypto_weight * 365)
        return ann_factor if ann_factor else 252

    @property
    def volatility(self):
        if not self.weights:
            return 0

        daily_vol = self.returns.std()
        return float(daily_vol * np.sqrt(self.ann_factor))

    @property
    def annualized_returns(self):

        return float((1 + self.returns.mean()) ** self.ann_factor - 1)

    @property
    def downside_deviation(self):
        returns = self.returns
        return np.sqrt(np.mean(np.minimum(returns, 0) ** 2))

    @property
    def sortino_ratio(self):
        if not self.weights:
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
    def weights(self):
        holdings_value = self.holdings_value()
        return {k: v / sum(holdings_value.values()) for k, v in holdings_value.items()}

    @property
    def sharpe_ratio(self):

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
    def beta(self):
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

    def VaR(self, confidence: float = 0.95):
        return float(np.abs(self.returns.quantile(1 - confidence) * self.get_value()))

    def correlation_matrix(self):
        df = pd.DataFrame()
        for ast in self.assets:
            df[ast.ticker] = ast.daily['rets']

        corr_matrix = df.corr()
        corr_matrix_masked = np.tril(corr_matrix, k=-1)

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
            title='Asset Correlation Matrix',
            height=800,
            xaxis=dict(
                tickangle=-90,
                side='bottom'
            ),
            yaxis=dict(
                autorange='reversed'
            )
        )

        fig.show()
        return fig

    def risk_decomposition(self):
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
            rows=2, cols=1,
            subplot_titles=('Portfolio Weight vs Risk Contribution', 'Marginal Risk'),
            vertical_spacing=0.2,
            row_heights=[0.7, 0.3]
        )

        # Create a color map for assets
        colors = px.colors.qualitative.Set2
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
                row=2, col=1
            )

        # Update layout
        fig.update_layout(
            barmode='stack',
            showlegend=True,
            height=800,
            title_text="Portfolio Risk Analysis"
        )

        # Update y-axes labels
        fig.update_yaxes(title_text="Percentage (%)", range=[0, 105], row=1, col=1)
        fig.update_yaxes(title_text="Marginal Risk", row=2, col=1)

        # Update x-axis for bottom subplot
        fig.update_xaxes(title_text="Assets", row=2, col=1)

        fig.show()

        return fig

    @property
    def max_drawdown(self):
        cum_rets = (1 + self.returns).cumprod()
        max_dd = (cum_rets / cum_rets.cummax() - 1).min()
        return float(max_dd)

    @property
    def drawdowns(self):
        cum_rets = (1 + self.returns).cumprod()
        drawdown = (cum_rets / cum_rets.cummax() - 1)
        return drawdown.dropna()

    @property
    def longest_drawdown_duration(self):
        drawdown = self.drawdowns
        drawdown_peaks = drawdown[drawdown == 0]
        end_idx = pd.Series(drawdown_peaks.index.diff()).idxmax()
        longest_end = drawdown_peaks.index[end_idx].date()
        longest_start = drawdown_peaks.index[end_idx - 1].date()
        longest_duration = (longest_end - longest_start).days
        return {'start': longest_start.strftime('%d-%m-%Y'), 'end': longest_end.strftime('%d-%m-%Y'), 'duration': longest_duration}

    @property
    def average_drawdown(self):
        drawdown = self.drawdowns[self.drawdowns < 0]
        return float(drawdown.mean())
    
    @property
    def drawdown_ratio(self):
        return self.max_drawdown / self.average_drawdown

    def time_to_recovery(self, min_duration: int = 3, min_depth: float = 0.05):
        df = self.drawdown_df
        return float(df[(df['duration'] >= min_duration) & (-df['depth'] >= np.abs(min_depth))]['time_to_recovery'].mean())

    def average_drawdown_duration(self, min_duration: int = 3, min_depth: float = 0.05):
        df = self.drawdown_df
        return float(df[(df['duration'] >= min_duration) & (-df['depth'] >= np.abs(min_depth))]['duration'].mean())

    def drawdown_frequency(self, bins: int = 20):
        df = self.drawdown_df
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
            title='Drawdown Frequency',
            xaxis_title='Drawdown Depth',
            yaxis_title='Frequency',
            yaxis=dict(
                    range=[0, None],
                    rangemode='nonnegative'
                ),
            bargap=0.05
        )
        fig.show()

        return troughs

    @property
    def drawdown_df(self):
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
    def calmar_ratio(self):
        return float(self.annualized_returns / np.abs(self.max_drawdown))

    @property
    def drawdown_metrics(self):
        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=self.drawdowns.index,
                y=self.drawdowns,
                mode='lines',
                name='Drawdown'
            )
        )

        fig.update_layout(
            title='Drawdown',
            xaxis_title='Date',
            yaxis_title='Drawdown',
            showlegend=False
        )

        fig.show()

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

    def save(self, name: str):
        state = {
            'holdings': {k.ticker: v for k, v in self.holdings.items()},
            'cost_bases': {k.ticker: v for k, v in self.cost_bases.items()},
            'assets': [ast.ticker for ast in self.assets],
            'cash': self.cash,
            'r': self.r,
            'currency': self.currency,
            'id': self.id,
        }

        with pg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO portfolio_states (name, state)
                    VALUES (%s, %s)
                    ON CONFLICT (name) 
                    DO UPDATE SET state = EXCLUDED.state
                """, (name, json.dumps(state)))

                for t in self.transactions:
                    ticker = t.asset if type(t.asset) == str else t.asset.ticker
                    cur.execute("""
                        INSERT INTO portfolio_transactions 
                        (name, type, asset, shares, value, profit, date, id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (name, id) 
                        DO NOTHING
                    """, (name, t.type, ticker, t.shares, t.value, t.profit, t.date, t.id))

    @classmethod
    def load(cls, name):
        with pg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT state FROM portfolio_states
                    WHERE name = %s
                """, (name,))
                state = cur.fetchone()[0]

                cur.execute("""
                    SELECT * FROM portfolio_transactions
                    WHERE name = %s
                """, (name,))
                transactions = cur.fetchall()

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
            ast = asset_mapping.get(t[2], 'Cash')
            t = cls.transaction(t[1], ast, t[3], t[4], t[5], t[6], t[7])
            t_list.append(t)

        port.transactions = t_list

        return port

    @classmethod
    def report(cls, name):
        pass

# TODO:
# make unique id for portfolio
# add vanguard lifestrategy mappings
