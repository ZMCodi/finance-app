'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AssetChart from "@/components/AssetChart";
import { useRouter } from "next/navigation";

export default function StrategyHome() {
  const router = useRouter();
  const handleTitleClick = () => {
    router.push('/strategy');
  };
  const formattedDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="flex-1">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            <button onClick={handleTitleClick} className="hover:text-blue-500 transition-colors">
              <span className="underline">Use technical indicators</span>
            </button>
          </CardTitle>
          <CardDescription>build and test trading strategies</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-full">
          <AssetChart 
          ticker='BTC-USD' 
          plot_type="candlestick" 
          queryString={`timeframe=5m&start_date=${formattedDate}`}
          nticks={3}
          />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
