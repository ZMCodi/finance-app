'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useResizeObserver } from "usehooks-ts";
import { AssetPlot, PlotJSON } from "@/src/api/index";

// Cache for storing chart data
export const chartDataCache: Record<string, PlotJSON[]> = {};

interface AssetChartProps {
    ticker: string;
    plot_type: 'price_history' | 'candlestick' | 'returns_distribution';
    queryString?: string;
    height?: number;
    width?: number;
    nticks?: number;
    skipFetch?: boolean;
    onLoad?: () => void;
}

const Plot = dynamic(() => import("react-plotly.js"), {
    ssr: false,
    loading: () => <div className='h-full flex items-center justify-center'>Loading...</div>, 
});

export default function AssetChart({ 
    ticker, 
    plot_type, 
    queryString = "", 
    height, 
    width, 
    nticks,
    skipFetch = false,
    onLoad
}: AssetChartProps) {
    const [plotData, setPlotData] = useState<PlotJSON[] | null>(null);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null!);
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
    
    // Create a cache key based on ticker, plot type, and query parameters
    const cacheKey = `${ticker}-${plot_type}-${queryString}`;
    
    // Use resize observer to track container size changes
    useResizeObserver({
        ref: containerRef,
        onResize: (entries) => {
            if (entries && entries.length > 0) {
                const { width, height } = entries[0].contentRect;
                setContainerDimensions({ width, height });
            }
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // If skipFetch is true and we have cached data, use it
                if (skipFetch && chartDataCache[cacheKey]) {
                    setPlotData(chartDataCache[cacheKey]);
                    setLoading(false);
                    return;
                }
                
                // Otherwise fetch new data
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets/${ticker}/${plot_type}?${queryString}`);
                const data: AssetPlot = await response.json();
                
                // Save to cache
                chartDataCache[cacheKey] = data.json_data;
                setPlotData(data.json_data);
                
                // Call onLoad callback if provided
                if (onLoad) {
                    onLoad();
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [ticker, plot_type, queryString, skipFetch, cacheKey, onLoad]);

    // Initialize container dimensions after mount
    useEffect(() => {
        if (containerRef.current) {
            const { offsetWidth, offsetHeight } = containerRef.current;
            setContainerDimensions({ 
                width: width || offsetWidth, 
                height: height || offsetHeight 
            });
        }
    }, [width, height]);

    // Function to combine multiple plot data into a single plot with subplots
    const renderCombinedPlot = () => {
        if (!plotData || plotData.length === 0) return null;

        // For candlestick with potentially multiple subplots
        if (plot_type === 'candlestick') {
            // Get the main candlestick chart data
            const mainChartData = plotData[0];
            const hasVolume = plotData.length > 1; // Check if we have volume data
            
            // Combine all traces
            let combinedData = [...mainChartData.data];
            
            // Create layout with main chart
            let layout = {
                ...mainChartData.layout,
                autosize: false,
                width: containerDimensions.width,
                height: containerDimensions.height,
                margin: { t: 40, r: 60, b: 30, l: 40 }, // Extra space on right for secondary y-axis
                xaxis: {
                    ...mainChartData.layout.xaxis,
                    nticks: nticks || 5,
                    rangeslider: { visible: false },
                    gridcolor: 'rgba(128, 128, 128, 0.2)',
                    showticklabels: hasVolume ? false : true // Hide x-axis labels if we have volume
                },
                yaxis: {
                    ...mainChartData.layout.yaxis,
                    domain: hasVolume ? [0.3, 1] : [0, 1], // Adjust domain based on volume presence
                    gridcolor: 'rgba(128, 128, 128, 0.2)',
                },
                // Add empty secondary y-axis that will be used for signals later
                yaxis2: {
                    title: 'Signal',
                    titlefont: { color: 'green' },
                    tickfont: { color: 'green' },
                    overlaying: 'y',
                    side: 'right',
                    range: [-1.5, 1.5],
                    showgrid: false,
                    zeroline: false,
                    showticklabels: false, // Hide initially since we don't have signals yet
                    tickvals: [-1, 1],
                    ticktext: ['Sell', 'Buy']
                }
            };
            
            // Add volume subplot if available
            if (hasVolume) {
                const volumeData = plotData[1];
                
                // Update volume traces to use yaxis3
                const volumeTraces = volumeData.data.map(trace => ({
                    ...trace,
                    yaxis: 'y3',
                    xaxis: 'x'
                }));
                
                // Add volume traces to combined data
                combinedData = [...combinedData, ...volumeTraces];
                
                // Configure volume y-axis
                layout.yaxis3 = {
                    title: 'Volume',
                    domain: [0, 0.25], // Volume gets bottom 25%
                    gridcolor: 'rgba(128, 128, 128, 0.2)',
                    showticklabels: true
                };
                
                // Configure shared x-axis for volume
                layout.xaxis.domain = [0, 1];
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
                />
            );
        } else {
            // For other plot types (price_history, returns_distribution)
            // Just render the first plot as before
            const singlePlotData = plotData[0];
            
            return (
                <Plot
                    data={singlePlotData.data}
                    layout={{
                        ...singlePlotData.layout,
                        autosize: false,
                        width: containerDimensions.width,
                        height: containerDimensions.height,
                        margin: { t: 40, r: 30, b: 30, l: 40 },
                        xaxis: {
                            ...singlePlotData.layout.xaxis,
                            nticks: nticks || 5,
                            rangeslider: { visible: false },
                            gridcolor: 'rgba(128, 128, 128, 0.2)',
                        },
                    }}
                    config={{
                        responsive: true,
                        displaylogo: false,
                        modeBarButtonsToRemove: ['resetScale2d', 'toImage', 'zoomIn2d', 'autoScale2d', 'select2d', 'lasso2d'],
                        logging: 0
                    }}
                    className="w-full h-full"
                />
            );
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full min-h-[300px]">
            {loading ? (
                <div className="w-full h-full flex items-center justify-center">Loading...</div>
            ) : (
                plotData && containerDimensions.width > 0 && (
                    <div className="w-full h-full">
                        {renderCombinedPlot()}
                    </div>
                )
            )}
        </div>
    );
}