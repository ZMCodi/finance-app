CREATE TABLE public.daily (
  ticker character varying(25) NOT NULL,
  date date NOT NULL,
  open numeric(16,5) NOT NULL,
  high numeric(16,5) NOT NULL,
  low numeric(16,5) NOT NULL,
  close numeric(16,5) NOT NULL,
  adj_close numeric(16,5) NOT NULL,
  volume bigint NOT NULL,
  CONSTRAINT daily_pkey PRIMARY KEY (ticker, date),
  CONSTRAINT daily_ticker_fkey FOREIGN KEY (ticker) REFERENCES tickers(ticker) ON DELETE CASCADE,
  CONSTRAINT daily_volume_check CHECK ((volume >= 0)),
  CONSTRAINT price_check CHECK (((high >= open) AND (high >= low) AND (high >= close) AND (low <= open) AND (low <= high) AND (low <= close)))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS daily_date_idx ON public.daily USING btree (date DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS daily_ticker_time_idx ON public.daily USING btree (ticker, date DESC) TABLESPACE pg_default;

CREATE TABLE public.daily_forex (
  currency_pair character varying(7) NOT NULL,
  date date NOT NULL,
  open numeric(16,5) NOT NULL,
  high numeric(16,5) NOT NULL,
  low numeric(16,5) NOT NULL,
  close numeric(16,5) NOT NULL,
  CONSTRAINT daily_forex_pkey PRIMARY KEY (currency_pair, date),
  CONSTRAINT price_check CHECK (((high >= open) AND (high >= low) AND (high >= close) AND (low <= open) AND (low <= high) AND (low <= close)))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS daily_forex_date_idx ON public.daily_forex USING btree (date DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS forex_time_idx ON public.daily_forex USING btree (currency_pair, date DESC) TABLESPACE pg_default;

CREATE TABLE public.five_minute (
  ticker character varying(25) NOT NULL,
  date timestamp with time zone NOT NULL,
  open numeric(16,5) NOT NULL,
  high numeric(16,5) NOT NULL,
  low numeric(16,5) NOT NULL,
  close numeric(16,5) NOT NULL,
  adj_close numeric(16,5) NOT NULL,
  volume bigint NOT NULL,
  CONSTRAINT five_minute_pkey PRIMARY KEY (ticker, date),
  CONSTRAINT five_minute_ticker_fkey FOREIGN KEY (ticker) REFERENCES tickers(ticker) ON DELETE CASCADE,
  CONSTRAINT five_minute_volume_check CHECK ((volume >= 0)),
  CONSTRAINT price_check CHECK (((high >= open) AND (high >= low) AND (high >= close) AND (low <= open) AND (low <= high) AND (low <= close)))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS five_minute_date_idx ON public.five_minute USING btree (date DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS five_minute_ticker_time_idx ON public.five_minute USING btree (ticker, date DESC) TABLESPACE pg_default;

CREATE TABLE public.portfolio_transactions (
  id text NOT NULL,
  portfolio_id uuid NOT NULL,
  type text NOT NULL,
  asset text NOT NULL,
  shares real NOT NULL,
  value real NOT NULL,
  profit real NOT NULL,
  date character varying(10) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT portfolio_transactions_pkey PRIMARY KEY (id, portfolio_id),
  CONSTRAINT portfolio_transactions_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.portfolios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL,
  state jsonb NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT portfolios_pkey PRIMARY KEY (id),
  CONSTRAINT portfolios_name_user_id_key UNIQUE (name, user_id),
  CONSTRAINT portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.test (
  ticker character varying NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  date timestamp with time zone NOT NULL,
  CONSTRAINT test_ticker_fkey FOREIGN KEY (ticker) REFERENCES tickers(ticker)
) TABLESPACE pg_default;

CREATE TABLE public.tickers (
  ticker character varying(25) NOT NULL,
  comp_name character varying(100) NOT NULL,
  exchange character varying(100) NOT NULL,
  sector character varying(100) NULL,
  market_cap bigint NULL,
  start_date date NOT NULL,
  asset_type character varying(20) NOT NULL,
  currency character varying(3) NOT NULL,
  timezone character varying(3) NOT NULL,
  CONSTRAINT tickers_pkey PRIMARY KEY (ticker)
) TABLESPACE pg_default;

create table public.watchlist (
  user_id uuid not null,
  ticker character varying(25) not null,
  constraint watchlist_ticker_fkey foreign KEY (ticker) references tickers (ticker) on delete CASCADE,
  constraint watchlist_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.strategies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL,
  parameters jsonb NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT strategies_pkey PRIMARY KEY (id),
  CONSTRAINT strategies_name_user_id_key UNIQUE (name, user_id),
  CONSTRAINT strategies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.strategy_indicators (
  type text NOT NULL,
  strategy_id uuid NOT NULL,
  parameters jsonb NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT strategy_indicators_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
) TABLESPACE pg_default;
