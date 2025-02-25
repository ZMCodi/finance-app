// app/strategy/components/ChartDisplay.tsx
'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import AssetChart from '@/components/AssetChart';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { IndicatorType } from './IndicatorPanel';
import { PlotJSON } from '@/src/api/index';

// Import Plotly dynamically to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

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
  activeIndicators: IndicatorType[];
  indicatorPlots: Record<string, PlotJSON>;
  strategies: Record<IndicatorType, string>;
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
  skipDailyFetch,
  activeIndicators,
  indicatorPlots,
  strategies
}: ChartDisplayProps) {
  // State to store main chart data
  const [mainChartData, setMainChartData] = useState<PlotJSON | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Effect to fetch and cache the main chart data
  useEffect(() => {
    const fetchMainChartData = async () => {
      try {
        const queryString = activeTab === '5m' ? fiveMinQueryString : dailyQueryString;
        const response = await fetch(`http://localhost:8000/api/assets/${ticker}/candlestick?${queryString}`);
        const data = await response.json();
        setMainChartData(data.json_data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching main chart data:", error);
        setLoading(false);
      }
    };
    
    if (!skipFiveMinFetch && activeTab === '5m') {
      fetchMainChartData();
    } else if (!skipDailyFetch && activeTab === '1d') {
      fetchMainChartData();
    }
  }, [ticker, activeTab, fiveMinQueryString, dailyQueryString, skipFiveMinFetch, skipDailyFetch]);
  
  // Function to determine if an indicator should be in a separate subplot
  const isSubplotIndicator = (indicator: IndicatorType): boolean => {
    return indicator === 'RSI' || indicator === 'MACD';
  };
  
  // Function to create a combined plot with indicators
  const renderCombinedPlot = () => {
    if (!mainChartData) return null;
    
    // Start with the main chart data
    const combinedData = [...mainChartData.data];
    
    // Create a new layout based on the main chart layout
    let layout = { 
      ...mainChartData.layout,
      // Ensure dark grid colors are set for the main chart
      xaxis: {
        ...mainChartData.layout.xaxis,
        gridcolor: 'rgba(50, 50, 50, 0.2)',
        zerolinecolor: 'rgba(50, 50, 50, 0.5)'
      },
      yaxis: {
        ...mainChartData.layout.yaxis,
        gridcolor: 'rgba(50, 50, 50, 0.2)',
        zerolinecolor: 'rgba(50, 50, 50, 0.5)',
        domain: [0.3, 1]  // Reserve space for subplots
      },
      paper_bgcolor: mainChartData.layout.paper_bgcolor || 'rgba(0,0,0,0)',
      plot_bgcolor: mainChartData.layout.plot_bgcolor || 'rgba(0,0,0,0)',
      shapes: [...(mainChartData.layout.shapes || [])]  // Initialize shapes array
    };
    
    // Track how many subplot indicators we have
    let subplotCount = 0;
    
    // Add each indicator's data
    activeIndicators.forEach(indicator => {
      const strategyId = strategies[indicator];
      const plotData = indicatorPlots[strategyId];
      
      if (!plotData) return;
      
      if (isSubplotIndicator(indicator)) {
        // For RSI and MACD, create a separate subplot
        subplotCount++;
        
        // Calculate domain for this subplot (RSI at bottom, then MACD if present)
        const subplotHeight = 0.25;
        const subplotDomain = [0, subplotHeight];
        
        // Create a new y-axis for this subplot
        const yaxisKey = `yaxis${subplotCount + 1}`;
        
        // Special handling for RSI
        if (indicator === 'RSI') {
          layout[yaxisKey] = {
            title: 'RSI',
            domain: subplotDomain,
            range: [0, 100],  // Fixed range for RSI
            gridcolor: 'rgba(50, 50, 50, 0.2)',
            zerolinecolor: 'rgba(50, 50, 50, 0.5)'
          };
          
          // Add RSI traces
          plotData.data.forEach(trace => {
            combinedData.push({
              ...trace,
              yaxis: `y${subplotCount + 1}`
            });
          });
          
          // Add overbought/oversold lines from layout.shapes if they exist
          if (plotData.layout && plotData.layout.shapes) {
            plotData.layout.shapes.forEach(shape => {
              if ((shape.y0 === 70 && shape.y1 === 70) || (shape.y0 === 30 && shape.y1 === 30)) {
                // This is an overbought/oversold line
                layout.shapes.push({
                  ...shape,
                  yref: `y${subplotCount + 1}`,  // Reference the correct y-axis
                  line: {
                    ...shape.line,
                  }
                });
              }
            });
          }
        } else if (indicator === 'MACD') {
          // MACD layout handling
          layout[yaxisKey] = {
            title: 'MACD',
            domain: subplotDomain,
            gridcolor: 'rgba(50, 50, 50, 0.2)',
            zerolinecolor: 'rgba(50, 50, 50, 0.5)'
          };
          
          // Add all MACD traces with the correct y-axis
          plotData.data.forEach(trace => {
            combinedData.push({
              ...trace,
              yaxis: `y${subplotCount + 1}`
            });
          });
          
          // Add any shapes from MACD layout if they exist
          if (plotData.layout && plotData.layout.shapes) {
            plotData.layout.shapes.forEach(shape => {
              layout.shapes.push({
                ...shape,
                yref: `y${subplotCount + 1}`  // Reference the correct y-axis
              });
            });
          }
        }
      } else {
        // For MA Crossover and Bollinger Bands, overlay on the main chart
        plotData.data.forEach(trace => {
          combinedData.push(trace);
        });
        
        // Add any shapes from the indicator's layout if they exist
        if (plotData.layout && plotData.layout.shapes) {
          plotData.layout.shapes.forEach(shape => {
            layout.shapes.push(shape);
          });
        }
      }
    });
    
    // Adjust layout based on subplot count
    if (subplotCount > 0) {
      layout = {
        ...layout,
        grid: {
          rows: subplotCount + 1,
          columns: 1,
          pattern: 'independent',
          roworder: 'bottom to top'
        }
      };
    }
    
    return (
      <Plot
        data={combinedData}
        layout={layout}
        config={{
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['resetScale2d', 'toImage', 'zoomIn2d', 'autoScale2d', 'select2d', 'lasso2d'],
        }}
        className="w-full h-full"
      />
    );
  };

  return (
    <div className="h-[70vh]">
      <Tabs value={activeTab} className="h-full">
        <TabsContent value="5m" className="h-full">
          <div className="relative h-full">
            {showIndicators && activeIndicators.length > 0 && Object.keys(indicatorPlots).length > 0 ? (
              // If we have indicators, use the combined plot
              <div className="w-full h-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">Loading...</div>
                ) : (
                  renderCombinedPlot()
                )}
              </div>
            ) : (
              // Otherwise use the standard AssetChart component
              <AssetChart 
                key={`${ticker}-5m`}
                ticker={ticker} 
                plot_type="candlestick"
                queryString={fiveMinQueryString}
                skipFetch={skipFiveMinFetch}
                onLoad={onFiveMinLoad}
              />
            )}
            
            {/* Display indicator badges */}
            {activeIndicators.length > 0 && (
              <div className="absolute top-2 right-2 p-2 bg-slate-800/80 rounded-lg border border-slate-700 backdrop-blur-sm">
                <div className="flex flex-col gap-1">
                  {activeIndicators.map((indicator) => (
                    <div key={indicator} className="flex justify-between items-center gap-4">
                      <span className="text-xs font-medium">{indicator}</span>
                      <button className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded">
                        Settings
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="1d" className="h-full">
          <div className="relative h-full">
            {showIndicators && activeIndicators.length > 0 && Object.keys(indicatorPlots).length > 0 ? (
              // If we have indicators, use the combined plot
              <div className="w-full h-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">Loading...</div>
                ) : (
                  renderCombinedPlot()
                )}
              </div>
            ) : (
              // Otherwise use the standard AssetChart component
              <AssetChart 
                key={`${ticker}-1d`}
                ticker={ticker} 
                plot_type="candlestick"
                queryString={dailyQueryString}
                skipFetch={skipDailyFetch}
                onLoad={onDailyLoad}
              />
            )}
            
            {/* Display indicator badges */}
            {activeIndicators.length > 0 && (
              <div className="absolute top-2 right-2 p-2 bg-slate-800/80 rounded-lg border border-slate-700 backdrop-blur-sm">
                <div className="flex flex-col gap-1">
                  {activeIndicators.map((indicator) => (
                    <div key={indicator} className="flex justify-between items-center gap-4">
                      <span className="text-xs font-medium">{indicator}</span>
                      <button className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded">
                        Settings
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}