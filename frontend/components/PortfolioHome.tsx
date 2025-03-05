'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DefaultService } from "@/src/api/services/DefaultService";
import dynamic from 'next/dynamic';

// Dynamically import Plotly to ensure client-side rendering
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading chart...</div>
});

export default function PortfolioHome() {
  const router = useRouter();
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setIsLoading(true);
        const data = await DefaultService.homeApiPortfolioHomeGet();
        setPortfolioData(data);
      } catch (err) {
        setError("Failed to fetch portfolio data");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  const handleTitleClick = () => {
    router.push('/portfolio');
  };

  return (
    <Card className="h-[50vh]">
      <CardHeader>
        <CardTitle>
          <button onClick={handleTitleClick} className="hover:text-blue-500 transition-colors">
            <span className="underline">Build or upload your portfolio</span>
          </button>
        </CardTitle>
        <CardDescription>track your investment performance</CardDescription>
      </CardHeader>
      <CardContent className="h-full flex-1">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">Loading portfolio data...</div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <div className="h-full">
              {portfolioData?.holdings_chart && (
                <Plot
                  data={portfolioData.holdings_chart.data}
                  layout={{
                    ...portfolioData.holdings_chart.layout,
                    autosize: true,
                    margin: { l: 40, r: 20, t: 0, b: 40 }
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '90%' }}
                />
              )}
            </div>
            <div className="h-full">
              {portfolioData?.asset_type_exposure && (
                <Plot
                  data={portfolioData.asset_type_exposure.data}
                  layout={{
                    ...portfolioData.asset_type_exposure.layout,
                    autosize: true,
                    margin: { l: 40, r: 20, t: 0, b: 40 }
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '90%' }}
                />
              )}
            </div>
            <div className="h-full">
              {portfolioData?.sector_exposure && (
                <Plot
                  data={portfolioData.sector_exposure.data}
                  layout={{
                    ...portfolioData.sector_exposure.layout,
                    autosize: true,
                    margin: { l: 40, r: 20, t: 0, b: 40 }
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '90%' }}
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}