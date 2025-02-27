'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import MiniStrategyChart from "./MiniStrategyChart";

export default function StrategyHome() {
  const router = useRouter();
  const handleTitleClick = () => {
    router.push('/strategy');
  };
  
  // Use the same date logic as the original component
  const formattedDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Create query string for the chart
  const queryString = `timeframe=5m&start_date=${formattedDate}&volume=false`;

  return (
    <div className="flex-1">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            <button onClick={handleTitleClick} className="hover:text-blue-500 transition-colors">
              <span className="underline">Use technical indicators</span>
            </button>
          </CardTitle>
          <CardDescription>build and backtest trading strategies</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-full">
            <MiniStrategyChart 
              ticker="BTC-USD"
              queryString={queryString}
              strategy="bb"
              // height={300}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}