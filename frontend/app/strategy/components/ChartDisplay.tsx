// app/strategy/components/ChartDisplay.tsx
'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import AssetChart from '@/components/AssetChart';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { IndicatorType } from './IndicatorPanel';
import { PlotJSON } from '@/src/api/index';
import { chartDataCache } from '@/components/AssetChart';

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
  indicatorPlots: Record<string, PlotJSON[]>;
  strategies: Record<IndicatorType, string>;
  signalData: Record<IndicatorType, any>;
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
  strategies,
  signalData
}: ChartDisplayProps) {
  // State to store main chart data
  const [mainChartData, setMainChartData] = useState<PlotJSON[] | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Effect to fetch and cache the main chart data
  useEffect(() => {
    const fetchMainChartData = async () => {
      try {
        const queryString = activeTab === '5m' ? fiveMinQueryString : dailyQueryString;
        const cacheKey = `${ticker}-candlestick-${queryString}`;
        
        // Check if data exists in cache
        if ((skipFiveMinFetch && activeTab === '5m') || (skipDailyFetch && activeTab === '1d')) {
          if (chartDataCache[cacheKey]) {
            console.log('Using cached candlestick data:', cacheKey);
            setMainChartData(chartDataCache[cacheKey]);
            setLoading(false);
            return;
          }
        }
        
        // Fetch from API if not in cache
        console.log('Fetching candlestick data:', cacheKey);
        const response = await fetch(`http://localhost:8000/api/assets/${ticker}/candlestick?${queryString}`);
        const data = await response.json();
        
        // Store in cache
        chartDataCache[cacheKey] = data.json_data;
        setMainChartData(data.json_data);
        setLoading(false);
        
        // Call appropriate callback
        if (activeTab === '5m') {
          onFiveMinLoad();
        } else {
          onDailyLoad();
        }
      } catch (error) {
        console.error("Error fetching main chart data:", error);
        setLoading(false);
      }
    };
    
    // Only fetch if we need to
    if ((!skipFiveMinFetch && activeTab === '5m') || (!skipDailyFetch && activeTab === '1d')) {
      fetchMainChartData();
    } else {
      // Try to load from cache anyway
      const queryString = activeTab === '5m' ? fiveMinQueryString : dailyQueryString;
      const cacheKey = `${ticker}-candlestick-${queryString}`;
      
      if (chartDataCache[cacheKey]) {
        console.log('Using cached candlestick data (skip fetch):', cacheKey);
        setMainChartData(chartDataCache[cacheKey]);
        setLoading(false);
      }
    }
  }, [ticker, activeTab, fiveMinQueryString, dailyQueryString, skipFiveMinFetch, skipDailyFetch, onFiveMinLoad, onDailyLoad]);
  
  // Function to determine if an indicator should be in a separate subplot
  const isSubplotIndicator = (indicator: IndicatorType): boolean => {
    return indicator === 'RSI' || indicator === 'MACD';
  };
  
  // Function to create a combined plot with indicators
  const renderCombinedPlot = () => {
    if (!mainChartData || mainChartData.length === 0) return null;
    
    // Get the main chart data (first element in the array)
    const mainPlot = mainChartData[0];
    
    // Check if we have volume (second element in the array)
    const hasVolume = mainChartData.length > 1;
    const volumePlot = hasVolume ? mainChartData[1] : null;
    
    // Start with the main chart data
    const combinedData = [...mainPlot.data];
    
    // Count how many additional subplots we'll need
    const rsiActive = activeIndicators.includes('RSI');
    const macdActive = activeIndicators.includes('MACD');
    
    // Count the total number of panels needed (excluding main chart and volume)
    const numAdditionalSubplots = (rsiActive ? 1 : 0) + (macdActive ? 1 : 0);
    const totalSubplots = numAdditionalSubplots + (hasVolume ? 1 : 0);
    
    // Create a new layout based on the main chart layout
    let layout = { 
      ...mainPlot.layout,
      // Ensure dark grid colors are set for the main chart
      xaxis: {
        ...mainPlot.layout.xaxis,
        gridcolor: 'rgba(50, 50, 50, 0.2)',
        zerolinecolor: 'rgba(50, 50, 50, 0.5)',
        // Hide x-axis labels for the main chart if we have subplots
        showticklabels: totalSubplots === 0,
        rangeslider: { visible: false }
      },
      paper_bgcolor: mainPlot.layout.paper_bgcolor || 'rgba(0,0,0,0)',
      plot_bgcolor: mainPlot.layout.plot_bgcolor || 'rgba(0,0,0,0)',
      shapes: [...(mainPlot.layout.shapes || [])]
    };
    
    // Calculate heights for subplots
    const additionalSubplotHeight = 0.2; // 20% for each additional subplot (RSI, MACD)
    const volumeHeight = 0.15; // 15% for volume
    
    // Main chart height calculation
    let mainChartHeight = 1.0;
    if (totalSubplots > 0) {
      mainChartHeight = 1.0 - (numAdditionalSubplots * additionalSubplotHeight) - (hasVolume ? volumeHeight : 0);
      mainChartHeight = Math.max(0.4, mainChartHeight); // Ensure main chart is at least 40%
    }
    
    // Set main chart yaxis domain - place at the top
    layout.yaxis = {
      ...layout.yaxis,
      domain: [1 - mainChartHeight, 1] // Main chart at the top
    };
    
    // Add secondary y-axis for signals - attached to the main chart
    layout.yaxis2 = {
      title: 'Signal',
      titlefont: { color: 'green' },
      tickfont: { color: 'green' },
      overlaying: 'y',
      side: 'right',
      range: [-1.5, 1.5], // Set fixed range for signal
      showgrid: false,
      zeroline: false,
      tickvals: [-1, 1],
      ticktext: ['Sell', 'Buy'],
      domain: layout.yaxis.domain // Same domain as main chart
    };
    
    // Add signals if available for any active indicator
    for (const indicator of activeIndicators) {
      if (signalData[indicator]) {
        const signalResult = signalData[indicator];
        
        // Convert the signals object to arrays for plotting
        const dates = Object.keys(signalResult.signals);
        const values = Object.values(signalResult.signals) as number[];
        
        if (dates.length > 0) {
          // Create the signal trace
          const signalTrace = {
            x: dates,
            y: values,
            type: 'scatter',
            mode: 'lines',
            name: `${indicator} Signal`,
            line: {
              color: 'green',
              width: 1.5
            },
            yaxis: 'y2', // Use the secondary y-axis
            // Make sure it's visible by setting showlegend
            showlegend: true
          };
          
          // Add to combined data
          combinedData.push(signalTrace);
          
          // Make sure the secondary y-axis is visible now that we have data
          layout.yaxis2.showticklabels = true;
        }
      }
    }
    
    // Track current position for subplots
    let currentPosition = 1 - mainChartHeight;
    const axisMappings = {}; // Map indicator types to y-axis numbers
    
    // Add volume if present
    if (hasVolume && volumePlot) {
      const volumeDomainTop = currentPosition;
      currentPosition -= volumeHeight;
      currentPosition = Math.max(0, currentPosition);
      
      const volumeYAxisNumber = 3; // yaxis3 for volume
      
      layout[`yaxis${volumeYAxisNumber}`] = {
        title: 'Volume',
        domain: [currentPosition, volumeDomainTop],
        gridcolor: 'rgba(50, 50, 50, 0.2)',
        zerolinecolor: 'rgba(50, 50, 50, 0.5)',
        showticklabels: true
      };
      
      layout[`xaxis${volumeYAxisNumber}`] = {
        showticklabels: totalSubplots === 1, // Show labels only if this is the last subplot
        gridcolor: 'rgba(50, 50, 50, 0.2)',
        zerolinecolor: 'rgba(50, 50, 50, 0.5)',
        // Match the range of the main x-axis
        range: layout.xaxis.range,
        type: layout.xaxis.type
      };
      
      // Add volume traces
      volumePlot.data.forEach(trace => {
        const volumeTrace = {
          ...trace,
          yaxis: `y${volumeYAxisNumber}`,
          xaxis: `x` // Share the main x-axis
        };
        combinedData.push(volumeTrace);
      });
    }
    
    // Add RSI if active
    let rsiYAxisNumber = hasVolume ? 4 : 3;
    if (rsiActive) {
      const strategyId = strategies['RSI'];
      const plotData = indicatorPlots[strategyId];
      
      if (plotData && plotData.length > 0) {
        const rsiPlot = plotData[0];
        
        // Store the y-axis mapping for this indicator
        axisMappings['RSI'] = rsiYAxisNumber;
        
        // Calculate domain for RSI
        const rsiDomainTop = currentPosition;
        currentPosition -= additionalSubplotHeight;
        currentPosition = Math.max(0, currentPosition);
        
        // Create RSI y-axis
        layout[`yaxis${rsiYAxisNumber}`] = {
          title: 'RSI',
          domain: [currentPosition, rsiDomainTop],
          range: [0, 100], // Fixed range for RSI
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)',
          showticklabels: true
        };
        
        // Add RSI traces
        rsiPlot.data.forEach(trace => {
          combinedData.push({
            ...trace,
            yaxis: `y${rsiYAxisNumber}`,
            xaxis: 'x' // Share the main x-axis
          });
        });
        
        // Add overbought/oversold lines
        if (rsiPlot.layout && rsiPlot.layout.shapes) {
          rsiPlot.layout.shapes.forEach(shape => {
            layout.shapes.push({
              ...shape,
              yref: `y${rsiYAxisNumber}`
            });
          });
        }
      }
    }
    
    // Add MACD if active
    let macdYAxisNumber = rsiActive ? rsiYAxisNumber + 1 : (hasVolume ? 4 : 3);
    if (macdActive) {
      const strategyId = strategies['MACD'];
      const plotData = indicatorPlots[strategyId];
      
      if (plotData && plotData.length > 0) {
        const macdPlot = plotData[0];
        
        // Store the y-axis mapping for this indicator
        axisMappings['MACD'] = macdYAxisNumber;
        
        // Calculate domain for MACD
        const macdDomainTop = currentPosition;
        currentPosition -= additionalSubplotHeight;
        currentPosition = Math.max(0, currentPosition);
        
        // Create MACD y-axis
        layout[`yaxis${macdYAxisNumber}`] = {
          title: 'MACD',
          domain: [currentPosition, macdDomainTop],
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)',
          showticklabels: true
        };
        
        // Add MACD traces
        macdPlot.data.forEach(trace => {
          combinedData.push({
            ...trace,
            yaxis: `y${macdYAxisNumber}`,
            xaxis: 'x' // Share the main x-axis
          });
        });
      }
    }
    
    // Add MA and BB overlays
    activeIndicators.forEach(indicator => {
      if (indicator !== 'RSI' && indicator !== 'MACD') {
        const strategyId = strategies[indicator];
        const plotData = indicatorPlots[strategyId];
        
        if (plotData && plotData.length > 0) {
          const indicatorPlot = plotData[0];
          
          // Overlay on main chart
          indicatorPlot.data.forEach(trace => {
            // These indicators are overlaid on the main price chart
            combinedData.push(trace);
          });
          
          // Add any shapes
          if (indicatorPlot.layout && indicatorPlot.layout.shapes) {
            indicatorPlot.layout.shapes.forEach(shape => {
              layout.shapes.push(shape);
            });
          }
        }
      }
    });
    
    // Ensure the bottom-most subplot shows x-axis labels
    if (totalSubplots > 0) {
      // Hide all x-axis labels first
      layout.xaxis.showticklabels = false;
      
      if (macdActive) {
        layout[`xaxis${macdYAxisNumber}`] = {
          showticklabels: true,
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)',
          // Match the range of the main x-axis
          range: layout.xaxis.range,
          type: layout.xaxis.type
        };
      } else if (rsiActive) {
        layout[`xaxis${rsiYAxisNumber}`] = {
          showticklabels: true,
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)',
          // Match the range of the main x-axis
          range: layout.xaxis.range,
          type: layout.xaxis.type
        };
      } else if (hasVolume) {
        // Volume is the bottom subplot
        layout[`xaxis3`].showticklabels = true;
      }
    }
    
    // Set up linked zoom behavior between all x-axes
    // Create an array of all x-axis keys
    const xAxisKeys = Object.keys(layout).filter(key => key.startsWith('xaxis') && key !== 'xaxis');
    
    // Link all x-axes to the main one
    xAxisKeys.forEach(key => {
      layout[key] = {
        ...layout[key],
        matches: 'x'
      };
    });
    
    return (
      <Plot
        data={combinedData}
        layout={layout}
        config={{
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['resetScale2d', 'toImage', 'zoomIn2d', 'autoScale2d', 'select2d', 'lasso2d'],
          logging: 0
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}