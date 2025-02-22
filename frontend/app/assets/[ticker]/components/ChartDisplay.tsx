'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Card, CardContent } from '@/components/ui/card';
import AssetChart from '@/components/AssetChart';

interface ChartDisplayProps {
  ticker: string;
  chartType: string;
  queryString: string;
}

export default function ChartDisplay({ 
  ticker, 
  chartType, 
  queryString 
}: ChartDisplayProps) {
  return (
    <Card className="lg:col-span-3">
      <CardContent className="pt-6">
        <AssetChart 
          ticker={ticker}
          plot_type={chartType as any}
          queryString={queryString}
        />
      </CardContent>
    </Card>
  );
}