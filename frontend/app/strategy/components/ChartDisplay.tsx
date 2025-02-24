// app/strategy/components/ChartDisplay.tsx
'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import AssetChart from '@/components/AssetChart';

type ChartDisplayProps = {
  ticker: string;
  activeTab: string;
  showIndicators: boolean;
  fiveMinQueryString: string;
  dailyQueryString: string;
  onFiveMinLoad: () => void;
  onDailyLoad: () => void;
  skipFiveMinFetch: boolean;
  skipDailyFetch: boolean;
};

export default function ChartDisplay({
  ticker,
  activeTab,
  showIndicators,
  fiveMinQueryString,
  dailyQueryString,
  onFiveMinLoad,
  onDailyLoad,
  skipFiveMinFetch,
  skipDailyFetch
}: ChartDisplayProps) {
  return (
    <div className="h-[70vh]">
      <Tabs value={activeTab} className="h-full">
        <TabsContent value="5m" className="h-full">
          <div className="relative h-full">
            <AssetChart 
              key={`${ticker}-5m`}
              ticker={ticker} 
              plot_type="candlestick"
              queryString={fiveMinQueryString}
              skipFetch={skipFiveMinFetch}
              onLoad={onFiveMinLoad}
            />
            
            {showIndicators && (
              <div className="absolute top-2 right-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border max-w-xs">
                <h3 className="text-sm font-medium mb-2">Technical Indicators</h3>
                <div className="space-y-2">
                  {/* This will be replaced with actual indicators */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Moving Average (20)</span>
                    <button className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Add</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">RSI (14)</span>
                    <button className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Add</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">MACD (12,26,9)</span>
                    <button className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Add</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Bollinger Bands (20, 2)</span>
                    <button className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Add</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="1d" className="h-full">
          <div className="relative h-full">
            <AssetChart 
              key={`${ticker}-1d`}
              ticker={ticker} 
              plot_type="candlestick"
              queryString={dailyQueryString}
              skipFetch={skipDailyFetch}
              onLoad={onDailyLoad}
            />
            
            {showIndicators && (
              <div className="absolute top-2 right-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border max-w-xs">
                <h3 className="text-sm font-medium mb-2">Technical Indicators</h3>
                <div className="space-y-2">
                  {/* This will be replaced with actual indicators */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Moving Average (20)</span>
                    <button className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Add</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">RSI (14)</span>
                    <button className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Add</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">MACD (12,26,9)</span>
                    <button className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Add</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Bollinger Bands (20, 2)</span>
                    <button className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Add</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}