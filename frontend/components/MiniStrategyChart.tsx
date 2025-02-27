'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { chartDataCache } from '@/components/AssetChart';
import { PlotJSON } from '@/src/api/index';

// Import Plotly dynamically to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

interface MiniStrategyChartProps {
  ticker: string;
  queryString: string;
  strategy: string;
  height?: number;
}

export default function MiniStrategyChart({ ticker, queryString, strategy, height = 300 }: MiniStrategyChartProps) {
  const [mainChartData, setMainChartData] = useState<PlotJSON[] | null>(null);
  const [indicatorPlots, setIndicatorPlots] = useState<Record<string, PlotJSON[]>>({});
  const [signalData, setSignalData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [strategyId, setStrategyId] = useState<string | null>(null);

  // Fetch main chart data
  useEffect(() => {
    const fetchMainChartData = async () => {
      try {
        const cacheKey = `${ticker}-candlestick-${queryString}`;
        
        // Check if data exists in cache
        if (chartDataCache[cacheKey]) {
          console.log('Using cached candlestick data:', cacheKey);
          setMainChartData(chartDataCache[cacheKey]);
        } else {
          // Fetch from API if not in cache
          console.log('Fetching candlestick data:', cacheKey);
          const response = await fetch(`http://localhost:8000/api/assets/${ticker}/candlestick?${queryString}`);
          const data = await response.json();
          
          // Store in cache
          chartDataCache[cacheKey] = data.json_data;
          setMainChartData(data.json_data);
        }
      } catch (error) {
        console.error("Error fetching main chart data:", error);
      }
    };
    
    fetchMainChartData();
  }, [ticker, queryString]);

  // Create BB strategy
  useEffect(() => {
    const createStrategy = async () => {
      try {
        // Create a BB strategy
        const response = await fetch(`http://localhost:8000/api/strategies/${ticker}/${strategy}`, {
          method: 'POST'
        });
        
        const data = await response.json();
        setStrategyId(data.strategy_id);
      } catch (error) {
        console.error("Error creating strategy:", error);
      }
    };
    
    if (mainChartData) {
      createStrategy();
    }
  }, [mainChartData, ticker]);

  // Fetch indicator and signal data
  useEffect(() => {
    const fetchIndicatorAndSignal = async () => {
      if (!strategyId) return;
      
      try {
        // Extract the timeframe from queryString for the API calls
        const timeframeMatch = queryString.match(/timeframe=([^&]+)/);
        const timeframe = timeframeMatch ? timeframeMatch[1] : '5m';
        
        // Extract date parameters if present
        const startDateMatch = queryString.match(/start_date=([^&]+)/);
        const startDate = startDateMatch ? startDateMatch[1] : null;
        
        const endDateMatch = queryString.match(/end_date=([^&]+)/);
        const endDate = endDateMatch ? endDateMatch[1] : null;
        
        // Construct parameters for API calls
        const params = new URLSearchParams();
        params.append('timeframe', timeframe);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        const paramsString = params.toString();
        
        // Fetch indicator plot
        console.log(`Fetching indicator for ${strategyId}`);
        const indicatorResponse = await fetch(`http://localhost:8000/api/strategies/${strategyId}/indicator?${paramsString}`);
        const indicatorData = await indicatorResponse.json();
        
        setIndicatorPlots(prev => ({
          ...prev,
          [strategyId]: indicatorData.json_data
        }));
        
        // Fetch signal
        console.log(`Fetching signals for ${strategyId}`);
        const signalResponse = await fetch(`http://localhost:8000/api/strategies/${strategyId}/signals?${paramsString}`);
        const signalData = await signalResponse.json();
        
        setSignalData(prev => ({
          ...prev,
          [strategyId]: signalData
        }));
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching indicator and signal data:", error);
        setLoading(false);
      }
    };
    
    fetchIndicatorAndSignal();
  }, [strategyId, queryString]);

  // Function to render the combined plot
  const renderCombinedPlot = () => {
    if (!mainChartData || mainChartData.length === 0) return null;
    
    // Get the main chart data (first element in the array)
    const mainPlot = mainChartData[0];
    
    // Check if we have volume (second element in the array)
    const hasVolume = mainChartData.length > 1;
    const volumePlot = hasVolume ? mainChartData[1] : null;
    
    // Start with the main chart data
    const combinedData = [...mainPlot.data];
    
    // Create a new layout based on the main chart layout
    let layout = { 
      ...mainPlot.layout,
      xaxis: {
        ...mainPlot.layout.xaxis,
        gridcolor: 'rgba(50, 50, 50, 0.2)',
        zerolinecolor: 'rgba(50, 50, 50, 0.5)',
        showticklabels: true,
        rangeslider: { visible: false }
      },
      paper_bgcolor: mainPlot.layout.paper_bgcolor || 'rgba(0,0,0,0)',
      plot_bgcolor: mainPlot.layout.plot_bgcolor || 'rgba(0,0,0,0)',
      shapes: [...(mainPlot.layout.shapes || [])],
      margin: {
        ...mainPlot.layout.margin,
        b: 20, 
        t: 10,
        l: 40,
        r: 40
      },
      height: height,
      showlegend: false
    };
    
    // Add secondary y-axis for signals - attached to the main chart
    layout.yaxis2 = {
      overlaying: 'y',
      side: 'right',
      range: [-1.1, 1.1], // Set fixed range for signal
      showgrid: false,
      zeroline: false,
      tickvals: [-1, 1],
      ticktext: ['Sell', 'Buy'],
      showticklabels: false, // Start hidden
    };
    
    // Set main chart yaxis domain
    layout.yaxis = {
      ...layout.yaxis,
      domain: hasVolume ? [0.3, 1] : [0, 1], // Adjust domain based on volume presence
      nticks: 3,
    };
    
    // Add BB indicator if available
    if (strategyId && indicatorPlots[strategyId] && indicatorPlots[strategyId].length > 0) {
      const indicatorPlot = indicatorPlots[strategyId][0];
      
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
    
    // Add signal if available
    if (strategyId && signalData[strategyId]) {
      const signalResult = signalData[strategyId];
      
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
          name: 'BB Signal',
          line: {
            color: 'green',
            width: 1.5
          },
          yaxis: 'y2', // Use the secondary y-axis
          showlegend: false
        };
        
        // Add to combined data
        combinedData.push(signalTrace);
        
        // Make sure the secondary y-axis is visible now that we have data
        layout.yaxis2.showticklabels = true;
      }
    }
    
    // Add volume if present
    if (hasVolume && volumePlot) {
      // Add volume traces
      volumePlot.data.forEach(trace => {
        const volumeTrace = {
          ...trace,
          yaxis: 'y3',
          xaxis: 'x' // Share the main x-axis
        };
        combinedData.push(volumeTrace);
      });
      
      // Configure volume y-axis
      layout.yaxis3 = {
        title: 'Volume',
        domain: [0, 0.25], // Volume gets bottom 25%
        gridcolor: 'rgba(50, 50, 50, 0.2)',
        zerolinecolor: 'rgba(50, 50, 50, 0.5)',
        showticklabels: false
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
          logging: 0
        }}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }} // Ensure full sizing
      />
    );
  };

  return (
    <div className="w-full h-full" style={{ minHeight: '250px' }}>
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">Loading...</div>
      ) : (
        renderCombinedPlot()
      )}
    </div>
  );
}