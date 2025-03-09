import yfinance as yf
from supabase import Client
import pandas as pd
import logging
import pandas_market_calendars as mcal
from datetime import datetime
import pytz
from dotenv import load_dotenv
import os
import json
import time

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE')

# logging.basicConfig(
#     filename=f'/Users/ZMCodi/git/personal/finance-app/backend/app/database/logs/stock_insertion_{datetime.now().strftime("%Y%m%d")}.log',
#     level=logging.INFO,
#     format='%(asctime)s - %(levelname)s - %(message)s'
# )

class YFEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (pd.Timestamp)):
            # Convert to ISO 8601 format with timezone info
            return obj.isoformat()
        return super().default(obj)

gbp = ['HIWS.L', 'V3AB.L', 'VFEG.L', 'VUSA.L', '0P0000TKZO.L']
mutual_fund = ['0P0000TKZO.L', 'SWTSX']

def insert_data(table):
    # logging.info(f"Starting {table} data insertion")
    try:
        sb = Client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        tickers = get_tickers(sb, table)
            
        # logging.info(f"Found {len(tickers)} tickers to process")

        if not tickers:
            return

        df_list = []
        failed_downloads = []
        for ticker in tickers:
            if table == 'five_minute' and ticker in mutual_fund:
                continue

            data = get_data(sb, table, ticker)
            
            if data.empty:
                failed_downloads.append(ticker)
                # logging.error(f"Failed to download {ticker} for {table} table")
                continue

            data = data.droplevel(1, axis=1)
            if table == 'daily_forex':
                data['currency_pair'] = f'{ticker[:3]}/{ticker[3:6]}'
            else:
                data['ticker'] = ticker

            if ticker not in gbp and ticker.endswith('.L'):
                data[['Open', 'High', 'Low', 'Close']] /= 100
                try:
                    data[['Adj Close']] /= 100
                except Exception as e:
                    pass
            df_list.append(data)
            # logging.info(f"Successfully downloaded data for {ticker}")

        if not df_list:
            # logging.info("No new data to insert")
            return
        
        df = pd.concat(df_list)
        # logging.info(f"Total rows before cleaning: {len(df)}")
        clean = clean_data(df)

        if table == 'daily_forex':
            clean = clean.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close'})
            clean = clean.drop(columns=['Adj Close', 'Volume'])
        elif table == 'five_minute':
            clean = clean.rename(columns={'Datetime': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
            if 'Adj Close' not in clean.columns:
                # logging.warning("Adj Close column not found in data, using Close price")
                clean['adj_close'] = clean['close']
            else:
                clean = clean.rename(columns={'Adj Close': 'adj_close'})
        else:
            clean = clean.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
            if 'Adj Close' not in clean.columns:
                # logging.warning("Adj Close column not found in data, using Close price")
                clean['adj_close'] = clean['close']
            else:
                clean = clean.rename(columns={'Adj Close': 'adj_close'})

        json_data = json.loads(json.dumps(clean.to_dict(orient='records'), cls=YFEncoder))
        sb.table(table).insert(json_data).execute()
        # logging.info(f"Successfully inserted {len(clean)} rows")
    
    except Exception as e:
        # logging.critical(f"Critical error in insert_{table}_data: {str(e)}")
        raise

def clean_data(df):
    mask = (df['High'] < df['Open']) | (df['High'] < df['Close']) | (df['Low'] > df['Open']) | (df['Low'] > df['Close'])
    clean = df[~mask].copy()
    temp = df[mask].copy()

    temp['High'] = temp[['Open', 'Close', 'High']].max(axis=1)
    temp['Low'] = temp[['Open', 'Close', 'Low']].min(axis=1)
    clean = pd.concat([clean, temp], axis=0)
    clean = clean.reset_index()
    # logging.info(f"Total rows after cleaning: {len(clean)}")
    return clean

def get_tickers(sb, table):
    try:
        if table == 'daily_forex':
            tickers = sb.rpc('get_distinct', dict(
                                column_name='currency_pair', 
                                table_name=table)
                                ).execute().data
            tickers = [f'{ticker[:3]}{ticker[4:7]}=X' for ticker in tickers]
        else:
            tickers = get_open_exchange(sb)

        return tickers
    
    except Exception as e:
        # logging.error(f"Fetching tickers error: {str(e)}")
        raise

def get_open_exchange(sb):
    try:
        exchanges = (
            sb.rpc('get_distinct', dict(
                column_name='exchange', table_name='tickers'))
                .execute()).data
        exchanges.remove('CCC')
        # logging.info(f"Found exchanges: {exchanges}")

        closed_exchanges = []
        for exchange in exchanges:
            exc = mcal.get_calendar(exchange)
            if exc.valid_days(start_date=datetime.today(), end_date=datetime.today()).empty:
                closed_exchanges.append(exchange)

        if closed_exchanges:
            # logging.info(f"Closed exchanges: {closed_exchanges}")

            tickers = (
                sb.table('tickers')
                .select('ticker')
                .not_.in_('exchange', closed_exchanges)
                .execute()
                ).data

        else:
            tickers = (
                sb.table('tickers')
                .select('ticker')
                .execute()
                ).data

        tickers = [ticker['ticker'] for ticker in tickers]

        return tickers
    
    except Exception as e:
        # logging.error(f"Error fetching market calendar: {str(e)}")
        raise

def get_data(sb, table, ticker):
    try:
        match table:
            case 'daily':
                last_date = (
                    sb.rpc('get_maxdate', dict(
                        table_name=table, filter=f"WHERE ticker = '{ticker}'"
                    ))
                    .execute()
                ).data[0]
            case 'five_minute':
                last_ts = (
                    sb.rpc('get_maxdatetime', dict(
                        filter=f"WHERE ticker = '{ticker}'"
                    ))
                    .execute()
                ).data[0]
            case 'daily_forex':
                last_date = (
                    sb.rpc('get_maxdate', dict(
                        table_name=table, filter=f"WHERE currency_pair = '{ticker[:3]}/{ticker[3:6]}'"
                    ))
                    .execute()
                ).data[0]

        if table == 'five_minute':
            last_ts = pd.to_datetime(last_ts)
            if last_ts is None:
                # logging.info("No existing data found, using default start date")
                last_date = datetime.now().date() - pd.Timedelta(days=61)
            else:
                last_date = last_ts.date()

            data = yf.download(ticker, start=last_date, interval='5m', auto_adjust=False)
            data = data[data.index > pd.to_datetime(last_ts)]

        else:
            last_date = pd.to_datetime(last_date)
            if last_date is None:
                # logging.info("No existing data found, using default start date")
                last_date = pd.to_datetime('2019-12-31')

            data = yf.download(ticker, start=last_date + pd.Timedelta(days=1), auto_adjust=False)
            data = data[data.index > pd.to_datetime(last_date)]


        # logging.info(f"Last date for {ticker}: {last_date}")
        return data
    
    except Exception as e:
        # logging.error(f"yfinance API error: {str(e)}")
        raise

def cleanup_old_data():
    try:
        sb = Client(SUPABASE_URL, SUPABASE_KEY)
        result = sb.rpc('delete_old_data').execute()
        # logging.info(f"Successfully executed cleanup of old data")
    except Exception as e:
        # logging.error(f"Failed to execute cleanup: {str(e)}")
        pass

def insert_new_ticker(ticker):
    yfticker = yf.Ticker(ticker)

    # Check valid ticker
    if yfticker.history().empty:
        print(f'{ticker} is an invalid yfinance ticker')
        return

    # transform metadata for insertion to database
    comp_name = yfticker.info['shortName'].replace("'", "''")
    exchange = yfticker.info['exchange']
    currency = yfticker.info['currency']
    in_pence = False
    if currency == 'GBp':
        currency = 'GBP'
        in_pence = True
    start_date = pd.to_datetime('today').date().isoformat()
    timezone = yfticker.info['exchangeTimezoneShortName']
    asset_type = yfticker.info['quoteType']
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
        'FGI': 'LSE',
        'NAS': 'NASDAQ',
    }
    exchange = exchange_mapping.get(exchange, exchange)

    # special handling for optional metadata
    market_cap = yfticker.info.get('marketCap')
    sector = yfticker.info.get('sector')
    if asset_type == 'Cryptocurrency':
        sector = 'Cryptocurrency'

    print(f'Inserting to DB {ticker=}, {comp_name=}, {exchange=}, {currency=}, {asset_type=}, {market_cap=}, {sector=}, {timezone=}')

    # Get daily data from 2020, clean and transform
    daily_data = yf.download(ticker, start='2020-01-01', auto_adjust=False)
    daily_data = daily_data.droplevel(1, axis=1)
    daily_data['ticker'] = ticker
    clean_daily = clean_data(daily_data)
    clean_daily = clean_daily.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})

    # adj_close column might not be available, especially for crypto
    if 'Adj Close' not in clean_daily.columns:
        clean_daily['adj_close'] = clean_daily['close']
    else:
        clean_daily = clean_daily.rename(columns={'Adj Close': 'adj_close'})

    if in_pence:
        clean_daily[['open', 'high', 'low', 'close', 'adj_close']] /= 100

    # Get 5min data
    if asset_type != 'Mutual Fund':
        five_min_data = yf.download(ticker, interval='5m', auto_adjust=False)
        five_min_data = five_min_data.droplevel(1, axis=1)
        five_min_data['ticker'] = ticker
        clean_five_min = clean_data(five_min_data)
        clean_five_min = clean_five_min.rename(columns={'Datetime': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
        if 'Adj Close' not in clean_five_min.columns:
            clean_five_min['adj_close'] = clean_five_min['close']
        else:
            clean_five_min = clean_five_min.rename(columns={'Adj Close': 'adj_close'})

        if in_pence:
            clean_five_min[['open', 'high', 'low', 'close', 'adj_close']] /= 100



    # Insert to database
    sb = Client(SUPABASE_URL, SUPABASE_KEY)
    currencies = sb.rpc('get_distinct_currency').execute().data

    # if asset's currency is not in db, add all possible pairs
    if currency not in currencies:
        add_new_currency(sb, currencies, currency)

    # insert metadata into db
    data_dict = {
        'ticker': ticker,
        'comp_name': comp_name,
        'exchange': exchange,
        'sector': sector,
        'market_cap': market_cap,
        'start_date': start_date,
        'currency': currency,
        'asset_type': asset_type,
        'timezone': timezone
    }
    sb.table('tickers').insert([data_dict]).execute()

    daily_json = json.loads(json.dumps(clean_daily.to_dict(orient='records'), cls=YFEncoder))
    sb.table('daily').insert(daily_json).execute()
    print(f'Inserted {ticker} daily data')

    if asset_type != 'Mutual Fund':
        five_min_json = json.loads(json.dumps(clean_five_min.to_dict(orient='records'), cls=YFEncoder))
        sb.table('five_minute').insert(five_min_json).execute()
        print(f'Inserted {ticker} 5min data')

def add_new_currency(sb, currencies, currency):
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
    clean = clean_data(df)
    clean.drop(columns=['Adj Close', 'Volume'], inplace=True)
    clean = clean.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close'})

    forex_json = json.loads(json.dumps(clean.to_dict(orient='records'), cls=YFEncoder))
    sb.table('daily_forex').insert(forex_json).execute()

if __name__ == '__main__':
    # logging.info("Starting insertion process")
    try:
        insert_data('daily')
        insert_data('five_minute')
        insert_data('daily_forex')
        cleanup_old_data()
        # logging.info("Finished insertion process successfully")
    except Exception as e:
        # logging.critical(f"Script failed: {str(e)}")
        pass