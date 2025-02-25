'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useResizeObserver } from "usehooks-ts";
import { AssetPlot, PlotJSON } from "@/src/api/index";

// Cache for storing chart data
export const chartDataCache: Record<string, PlotJSON> = {};

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
    loading: () => <div>Loading...</div>, 
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
    const [plotData, setPlotData] = useState<PlotJSON | null>(null);
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
                const response = await fetch(`http://localhost:8000/api/assets/${ticker}/${plot_type}?${queryString}`);
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

    return (
        <div ref={containerRef} className="w-full h-full min-h-[300px]">
            {loading ? (
                <div className="w-full h-full flex items-center justify-center">Loading...</div>
            ) : (
                plotData && containerDimensions.width > 0 && (
                    <div className="w-full h-full">
                        <Plot 
                            data={plotData.data}
                            layout={{
                                ...plotData.layout,
                                autosize: false,
                                width: containerDimensions.width,
                                height: containerDimensions.height,
                                margin: { t: 40, r: 30, b: 30, l: 40 },
                                xaxis: { 
                                    ...plotData.layout.xaxis,
                                    nticks: nticks || 5,
                                    rangeslider: {visible: false},
                                    gridcolor: 'rgba(128, 128, 128, 0.2)',
                                },
                            }}
                            config={{ 
                                responsive: true,
                                displaylogo: false,
                                modeBarButtonsToRemove: ['resetScale2d', 'toImage', 'zoomIn2d', 'autoScale2d', 'select2d', 'lasso2d'],
                            }}
                            className="w-full h-full"
                        />
                    </div>
                )
            )}
        </div>
    );
}