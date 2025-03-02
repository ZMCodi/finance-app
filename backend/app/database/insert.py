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

logging.basicConfig(
    filename=f'/Users/ZMCodi/git/personal/finance-app/backend/app/database/logs/stock_insertion_{datetime.now().strftime("%Y%m%d")}.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class YFEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (pd.Timestamp)):
            # Convert to ISO 8601 format with timezone info
            return obj.isoformat()
        return super().default(obj)

gbp = ['HIWS.L', 'V3AB.L', 'VFEG.L', 'VUSA.L', '0P0000TKZO.L']
mutual_fund = ['0P0000TKZO.L']

def insert_data(table):
    logging.info(f"Starting {table} data insertion")
    try:
        sb = Client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        tickers = get_tickers(sb, table)
            
        logging.info(f"Found {len(tickers)} tickers to process")

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
                logging.error(f"Failed to download {ticker} for {table} table")
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
            logging.info(f"Successfully downloaded data for {ticker}")

        if not df_list:
            logging.info("No new data to insert")
            return
        
        df = pd.concat(df_list)
        logging.info(f"Total rows before cleaning: {len(df)}")

        mask = (df['High'] < df['Open']) | (df['High'] < df['Close']) | (df['Low'] > df['Open']) | (df['Low'] > df['Close'])
        clean = df[~mask].copy()
        temp = df[mask].copy()

        temp['High'] = temp[['Open', 'Close', 'High']].max(axis=1)
        temp['Low'] = temp[['Open', 'Close', 'Low']].min(axis=1)
        clean = pd.concat([clean, temp], axis=0)
        clean = clean.reset_index()
        logging.info(f"Total rows after cleaning: {len(clean)}")

        if table == 'daily_forex':
            clean = clean.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close'})
            clean = clean.drop(columns=['Adj Close', 'Volume'])
        elif table == 'five_minute':
            clean = clean.rename(columns={'Datetime': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
            if 'Adj Close' not in clean.columns:
                logging.warning("Adj Close column not found in data, using Close price")
                clean['adj_close'] = clean['close']
            else:
                clean = clean.rename(columns={'Adj Close': 'adj_close'})
        else:
            clean = clean.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
            if 'Adj Close' not in clean.columns:
                logging.warning("Adj Close column not found in data, using Close price")
                clean['adj_close'] = clean['close']
            else:
                clean = clean.rename(columns={'Adj Close': 'adj_close'})

        json_data = json.loads(json.dumps(clean.to_dict(orient='records'), cls=YFEncoder))
        sb.table(table).insert(json_data).execute()
        logging.info(f"Successfully inserted {len(clean)} rows")
    
    except Exception as e:
        logging.critical(f"Critical error in insert_{table}_data: {str(e)}")
        raise

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
        logging.error(f"Fetching tickers error: {str(e)}")
        raise

def get_open_exchange(sb):
    try:
        exchanges = (
            sb.rpc('get_distinct', dict(
                column_name='exchange', table_name='tickers'))
                .execute()).data
        exchanges.remove('CCC')
        logging.info(f"Found exchanges: {exchanges}")

        closed_exchanges = []
        for exchange in exchanges:
            exc = mcal.get_calendar(exchange)
            if exc.valid_days(start_date=datetime.today(), end_date=datetime.today()).empty:
                closed_exchanges.append(exchange)

        if closed_exchanges:
            logging.info(f"Closed exchanges: {closed_exchanges}")

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
        logging.error(f"Error fetching market calendar: {str(e)}")
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
                logging.info("No existing data found, using default start date")
                last_date = datetime.now().date() - pd.Timedelta(days=61)
            else:
                last_date = last_ts.date()

            data = yf.download(ticker, start=last_date, interval='5m', auto_adjust=False)
            data = data[data.index > pd.to_datetime(last_ts)]

        else:
            last_date = pd.to_datetime(last_date)
            if last_date is None:
                logging.info("No existing data found, using default start date")
                last_date = pd.to_datetime('2019-12-31')
            
            data = yf.download(ticker, start=last_date + pd.Timedelta(days=1), auto_adjust=False)
            data = data[data.index > pd.to_datetime(last_date)]


        logging.info(f"Last date for {ticker}: {last_date}")
        return data
    
    except Exception as e:
        logging.error(f"yfinance API error: {str(e)}")
        raise


if __name__ == '__main__':
    logging.info("Starting insertion process")
    try:
        insert_data('daily')
        insert_data('five_minute')
        insert_data('daily_forex')
        logging.info("Finished insertion process successfully")
    except Exception as e:
        logging.critical(f"Script failed: {str(e)}")