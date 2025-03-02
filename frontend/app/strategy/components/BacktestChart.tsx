// app/strategy/components/BacktestChart.tsx
'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import Plotly dynamically to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className='h-full flex items-center justify-center'>Loading...</div>, 
});

interface BacktestChartProps {
  backtestResults: any;
}

export default function BacktestChart({ backtestResults }: BacktestChartProps) {
  if (!backtestResults || !backtestResults.json_data || backtestResults.json_data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No backtest results available. Click "Backtest" to analyze strategy performance.
      </div>
    );
  }

  // Extract the plot data from the backtest results
  const plotData = backtestResults.json_data[0];
  
  // Get the summary performance metrics
  const holdReturns = backtestResults.results.returns * 100;
  const strategyReturns = backtestResults.results.strategy * 100;
  
  // Format the returns for display
  const holdReturnsFormatted = holdReturns.toFixed(2);
  const strategyReturnsFormatted = strategyReturns.toFixed(2);
  
  // Determine if strategy outperformed holding
  const outperformed = strategyReturns > holdReturns;
  
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Performance summary */}
      <div className="p-1 pl-3 mb-2 bg-gray-100 dark:bg-gray-800 rounded flex flex-wrap gap-4">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Hold Returns</span>
          <span className="font-medium">{holdReturnsFormatted}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Strategy Returns</span>
          <span className={`font-medium ${outperformed ? 'text-green-500' : 'text-red-500'}`}>
            {strategyReturnsFormatted}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Performance</span>
          <span className={`font-medium ${outperformed ? 'text-green-500' : 'text-red-500'}`}>
            {outperformed ? 'Outperformed' : 'Underperformed'} by {Math.abs(strategyReturns - holdReturns).toFixed(2)}%
          </span>
        </div>
      </div>
      
      {/* The plot */}
      <div className="flex-1 w-full min-h-0 relative">
        <Plot
          data={plotData.data}
          layout={{
            ...plotData.layout,
            autosize: true,
            margin: { l: 50, r: 50, t: 30, b: 60 }, // Increased bottom margin for date labels
            legend: { orientation: 'h', y: 1.1 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            xaxis: {
              ...plotData.layout.xaxis,
              automargin: true, // Ensures labels don't get cut off
              tickangle: 0      // Horizontal tick labels
            }
          }}
          config={{
            responsive: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['resetScale2d', 'toImage', 'zoomIn2d', 'autoScale2d'],
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
          className="absolute inset-0"
        />
        </div>
    </div>
    );
}