# [FLApp](https://flapp.vercel.app)

A financial analysis web application that allows users to look at asset charts, test trading strategies, and analyze their portfolios.

## Explore the App

### Home page
![Homepage](/assets/homepage.png)
*Homepage with links to all pages*

### Assets page
![Assetspage](/assets/assetpage.png)
*Look up asset price charts and returns distribution and save them to your watchlist by signing up and logging in*

![Assetdetails](/assets/assetdetails.png)
*Get more details on the asset as well as more configurable charts by clicking on the asset name in the assets page*

### Strategy page
<div style="display: flex; gap: 10px;">
    <img src="assets/strategychart.png" width="50%" alt="Strategy chart" />
    <img src="assets/strategyconfigure.png" width="50%" alt="Strategy configuration" />
</div>

*Add technical indicators to an asset, configure and optimize parameters, and generate trading signals*

![Strategy](/assets/strategystrategy.png)
*Add the indicators to a strategy, backtest it over a certain timeframe and assess its performance. Save the signals by logging in*

### Portfolio page
<div style="display: flex; gap: 10px;">
    <img src="assets/portoliopage.png" width="50%" alt="Strategy chart" />
    <img src="assets/portfoliocreate.png" width="50%" alt="Strategy configuration" />
</div>

*View your saved portfolio if you're logged in, create a new one, or view the sample portfolio*

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
    <div>
        <img src="assets/portfolioholdings.png" width="100%" alt="Portfolio holdings" />
        <img src="assets/portfolioreturns.png" width="100%" alt="Portfolio analysis" />
    </div>
    <div>
        <img src="assets/portfoliorisk.png" width="100%" alt="Portfolio statistics" />
        <img src="assets/portfoliooptimize.png" width="100%" alt="Portfolio returns" />
    </div>
</div>

*View detailed portfolio dashboard and optimize your portfolio weights*


## Features

### Asset Analysis
- Interactive charts for various assets
- Detailed asset information and statistics
- Watchlist functionality to track favorite assets

### Trading Strategies
- Configuration and optimization for building custom trading strategies
- Support for various technical indicators (RSI, MACD, Bollinger Bands, Moving Average Crossovers)
- Strategy backtesting and performance analysis
- Save and load strategies for future use

### Portfolio Management
- Detailed portfolio dashboard with holdings and performance metrics
- Portfolio optimization and rebalancing capabilities
- Transaction history and tracking
- Risk analysis and returns visualization

## Tech Stack

### Frontend
- Next.js with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- react-plotly for interactive charts
- Supabase client for authentication and database access

### Backend
- FastAPI Python framework
- Portfolio optimization algorithms
- Technical analysis and signal generation
- Data processing and caching with Redis

### Infrastructure
- Supabase for database and authentication
- Vercel and Render for hosting
- Upstash Redis for caching

## Database Schema

The application uses a PostgreSQL database with tables for:
- Asset data (daily and 5-minute intervals)
- Ticker information
- User portfolios and transactions
- Trading strategies and indicators
- User watchlists

## Getting Started

### Prerequisites
- Node.js and npm
- Python 3.8+
- Supabase account
- Upstash Redis account

### Environment Setup

1. Create a `.env` file in the root directory with the following variables:
```
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key  # not necessary
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

2. Create an `.env.local` file in the `frontend` directory:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_API_URL=your_api_url
```

3. If you wish to use the project database, here are the keys
```
anon_key = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZHRteXVvZmVkYXJnbGJybnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MTY3MjMsImV4cCI6MjA1NjQ5MjcyM30.P7KYRlTjzZLh86LIdUj80Jn5wG2d08IEdZgS8T-enFE

url = https://atdtmyuofedarglbrnxf.supabase.co
```

Otherwise, you can create your own database using the schema in `backend/app/database/schema.sql`

### Installation

1. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

### Running the Application Locally

1. Start the backend server:
```bash
cd backend
fastapi dev app/main.py
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Access the application at `http://localhost:3000`

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── core/         # Core business logic
│   │   ├── database/     # Database connections and schemas
│   │   ├── models/       # Pydantic models
│   │   ├── routers/      # API routes
│   │   └── main.py       # Main application entry point
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js pages and components
│   ├── components/       # Reusable UI components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   └── src/api/          # API client code
└── README.md
```

## License

This project is licensed under the MIT License.
