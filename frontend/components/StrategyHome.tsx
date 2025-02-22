'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AssetChart from "@/components/AssetChart";
import { useRouter } from "next/navigation";

export default function StrategyHome() {
  const router = useRouter();
  const handleTitleClick = () => {
    router.push('/strategy');
  };
  const formattedDate = new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="dark pr-3 pl-3">
      <Card className="w-auto mt-5">
        <CardHeader>
          <CardTitle>
            <button onClick={handleTitleClick} className="hover:text-blue-500 transition-colors">
              <span>Use technical indicators</span>
            </button>
          </CardTitle>
          <CardDescription>build and test trading strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetChart 
          ticker='BTC-USD' 
          plot_type="candlestick" 
          width={500} 
          height={300}
          queryString={`timeframe=5m&start_date=${formattedDate}`}
          nticks={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
