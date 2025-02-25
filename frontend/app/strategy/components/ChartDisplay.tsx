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
    if (!mainChartData) return null;
    
    // Start with the main chart data
    const combinedData = [...mainChartData.data];
    
    // Determine if volume is displayed in the main chart data
    const hasVolume = mainChartData.data.some(trace => trace.name === 'Volume');
    
    // Count how many subplots we'll need
    const rsiActive = activeIndicators.includes('RSI');
    const macdActive = activeIndicators.includes('MACD');
    
    // Count the total number of panels needed
    const numSubplots = (hasVolume ? 1 : 0) + (rsiActive ? 1 : 0) + (macdActive ? 1 : 0);
    
    // Create a new layout based on the main chart layout
    let layout = { 
      ...mainChartData.layout,
      // Ensure dark grid colors are set for the main chart
      xaxis: {
        ...mainChartData.layout.xaxis,
        gridcolor: 'rgba(50, 50, 50, 0.2)',
        zerolinecolor: 'rgba(50, 50, 50, 0.5)',
        // Hide x-axis labels for the main chart
        showticklabels: false
      },
      paper_bgcolor: mainChartData.layout.paper_bgcolor || 'rgba(0,0,0,0)',
      plot_bgcolor: mainChartData.layout.plot_bgcolor || 'rgba(0,0,0,0)',
      shapes: [...(mainChartData.layout.shapes || [])]  // Initialize shapes array
    };
    
    // Calculate heights - each subplot gets 20% except the main chart
    const subplotHeight = 0.2; // 20% for each subplot
    const mainChartHeight = Math.max(0.4, 1 - (subplotHeight * numSubplots)); // At least 40% for main chart
    
    // Set main chart yaxis domain - place at the top
    layout.yaxis = {
      ...layout.yaxis,
      domain: [1 - mainChartHeight, 1] // Main chart at the top
    };
    
    // Track current position and the active subplots
    let currentPosition = 1 - mainChartHeight;
    const activeSubplots = [];
    
    // If volume is present, position it below the main chart
    if (hasVolume) {
      const volumeTraceIndex = mainChartData.data.findIndex(trace => trace.name === 'Volume');
      if (volumeTraceIndex !== -1) {
        // Remove volume from main data and update its y-axis
        const volumeTrace = { 
          ...mainChartData.data[volumeTraceIndex],
          yaxis: 'y2', // First subplot
          xaxis: 'x2'  // Make sure it uses its own x-axis
        };
        combinedData.splice(volumeTraceIndex, 1); // Remove from original position
        combinedData.push(volumeTrace); // Add with updated axis
        
        // Add volume y-axis
        const volumeDomainTop = currentPosition;
        currentPosition -= subplotHeight;
        
        layout.yaxis2 = {
          title: 'Volume',
          domain: [currentPosition, volumeDomainTop],
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)',
          showticklabels: false,  // Hide labels by default
        };
        
        layout.xaxis2 = {
          showticklabels: false,  // Hide labels by default
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)'
        };
        
        // Track that volume is an active subplot
        activeSubplots.push(2);
      }
    }
    
    // Add each indicator's data
    let indicatorIndex = hasVolume ? 1 : 0; // Start index after volume if present
    
    // Add RSI if active
    if (rsiActive) {
      const strategyId = strategies['RSI'];
      const plotData = indicatorPlots[strategyId];
      
      if (plotData) {
        const subplotNumber = indicatorIndex + 2; // +2 because yaxis1 is main, yaxis2 might be volume
        
        // Track that RSI is an active subplot
        activeSubplots.push(subplotNumber);
        
        // Calculate domain for RSI
        const rsiDomainTop = currentPosition;
        currentPosition -= subplotHeight;
        currentPosition = Math.max(0, currentPosition); // Ensure we don't go below 0
        
        // Create RSI y-axis
        layout[`yaxis${subplotNumber}`] = {
          title: 'RSI',
          domain: [currentPosition, rsiDomainTop],
          range: [0, 100],  // Fixed range for RSI
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)',
          showticklabels: false,  // Hide
        };
        
        // Create RSI x-axis
        layout[`xaxis${subplotNumber}`] = {
          showticklabels: false,  // Hide labels by default
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)'
        };
        
        // Add RSI traces
        plotData.data.forEach(trace => {
          combinedData.push({
            ...trace,
            yaxis: `y${subplotNumber}`,
            xaxis: `x${subplotNumber}`  // Make sure it uses its own x-axis
          });
        });
        
        // Add overbought/oversold lines
        if (plotData.layout && plotData.layout.shapes) {
          plotData.layout.shapes.forEach(shape => {
              layout.shapes.push({
                ...shape,
                yref: `y${subplotNumber}`,
                line: {
                  ...shape.line,
                }
              });
          });
        }

        indicatorIndex++;
      }
    }
    
    // Add MACD if active
    if (macdActive) {
      const strategyId = strategies['MACD'];
      const plotData = indicatorPlots[strategyId];
      
      if (plotData) {
        const subplotNumber = indicatorIndex + 2; // +2 because yaxis1 is main, yaxis2 might be volume or RSI
        
        // Track that MACD is an active subplot
        activeSubplots.push(subplotNumber);
        
        // Calculate domain for MACD
        const macdDomainTop = currentPosition;
        currentPosition -= subplotHeight;
        currentPosition = Math.max(0, currentPosition); // Ensure we don't go below 0
        
        // Create MACD y-axis
        layout[`yaxis${subplotNumber}`] = {
          title: 'MACD',
          domain: [currentPosition, macdDomainTop],
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)',
          showticklabels: false,  // Hide
        };
        
        // Create MACD x-axis
        layout[`xaxis${subplotNumber}`] = {
          showticklabels: false,  // Hide labels by default
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)'
        };
        
        // Add all MACD traces
        plotData.data.forEach(trace => {
          combinedData.push({
            ...trace,
            yaxis: `y${subplotNumber}`,
            xaxis: `x${subplotNumber}`  // Make sure it uses its own x-axis
          });
        });
        
        // Add any MACD layout shapes
        if (plotData.layout && plotData.layout.shapes) {
          plotData.layout.shapes.forEach(shape => {
            layout.shapes.push({
              ...shape,
              yref: `y${subplotNumber}`
            });
          });
        }
      }
    }
    
    // Add MA and BB overlays
    activeIndicators.forEach(indicator => {
      if (indicator !== 'RSI' && indicator !== 'MACD') {
        const strategyId = strategies[indicator];
        const plotData = indicatorPlots[strategyId];
        
        if (plotData) {
          // Overlay on main chart
          plotData.data.forEach(trace => {
            combinedData.push(trace);
          });
          
          // Add any shapes
          if (plotData.layout && plotData.layout.shapes) {
            plotData.layout.shapes.forEach(shape => {
              layout.shapes.push(shape);
            });
          }
        }
      }
    });
    
    // Update your renderCombinedPlot function to include shared x-axis configuration

    // Adjust layout for multiple plots
    if (numSubplots > 0) {
      layout = {
        ...layout,
        grid: {
          rows: numSubplots + 1, // +1 for main chart
          columns: 1,
          pattern: 'independent',
          roworder: 'top to bottom',
          // Add small gap between plots
          ygap: 0.03
        },
        margin: {
          ...layout.margin,
          b: 40, // Increase bottom margin
          t: 10, // Decrease top margin to make more space
        }
      };
      
      // First hide all x-axis labels
      layout.xaxis.showticklabels = false;
      
      // Find the bottom subplot and show its x-axis labels
      if (activeSubplots.length > 0) {
        // Sort subplots by number, highest is the last subplot added (which is at the bottom)
        activeSubplots.sort((a, b) => a - b);
        const bottomSubplotNumber = activeSubplots[activeSubplots.length - 1];
        
        // Get the x-axis properties we want to share across all subplots
        const sharedXAxisProps = {
          // These properties will be synchronized across all x-axes
          range: layout.xaxis.range,
          type: layout.xaxis.type,
          autorange: layout.xaxis.autorange,
          domain: layout.xaxis.domain,
          gridcolor: 'rgba(50, 50, 50, 0.2)',
          zerolinecolor: 'rgba(50, 50, 50, 0.5)',
          scaleanchor: 'x' // Anchor all x-axes to the main x-axis
        };
        
        // Apply shared x-axis properties to all subplots
        for (let i = 1; i <= numSubplots + 1; i++) {
          const axisName = i === 1 ? 'xaxis' : `xaxis${i}`;
          
          // Only the bottom subplot should show date labels
          const showLabels = i === bottomSubplotNumber;
          
          layout[axisName] = {
            ...layout[axisName],
            ...sharedXAxisProps,
            showticklabels: showLabels,
            // For bottom subplot, ensure we use the original tickformat
            ...(showLabels ? { tickformat: layout.xaxis.tickformat } : {}),
            nticks: 5
          };
        }
      }
      
      // Set up linked zoom behavior - critical part for synchronization
      layout.xaxis.matches = 'x';
      for (let i = 2; i <= numSubplots + 1; i++) {
        layout[`xaxis${i}`].matches = 'x';
      }
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
            
            {/* Remove the indicator badges panel */}
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
            
            {/* Remove the indicator badges panel */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}