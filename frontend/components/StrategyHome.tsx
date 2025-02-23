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
    <div className="dark m-auto w-[48.5%]">
      <Card className="w-full mt-5">
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
          height={300}
          queryString={`timeframe=5m&start_date=${formattedDate}`}
          nticks={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
