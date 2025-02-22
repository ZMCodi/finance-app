'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

interface PlotlyData {
    data: any[];
    layout: any;
}

interface AssetChartProps {
    ticker: string;
    plot_type: 'price_history' | 'candlestick' | 'returns_distribution';
    queryString?: string;
    height?: number;
    width?: number;
    nticks?: number;
}

const Plot = dynamic(() => import("react-plotly.js"), {
    ssr: false,
    loading: () => <div>Loading...</div>, 
});

export default function AssetChart({ ticker, plot_type, queryString, height, width, nticks }: AssetChartProps) {
    const [plotData, setPlotData] = useState<PlotlyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    const fetchData = async () => {
        try {
        const response = await fetch(`http://localhost:8000/api/assets/${ticker}/${plot_type}?${queryString}`);
        const data = await response.json();
        setPlotData(data.json_data);
        } catch (error) {
        console.error("Error fetching data:", error);
        } finally {
        setLoading(false);
        }
    };
    fetchData();
    }, [ticker, plot_type, queryString]);

    return (
    <div>
            {loading ? (
            <div>Loading...</div>
            ) : (
            plotData && (
                <div>
                <Plot 
                data={plotData.data}
                layout={{
                    ...plotData.layout,
                    autosize: true,
                    margin: { t: 40, r: 30, b: 30, l: 40 },
                    height: height,
                    width: width,
                    xaxis: { nticks: nticks || 5,
                        rangeslider: {visible: false},
                        gridcolor: 'rgba(128, 128, 128, 0.2)',
                     },
                }}
                config={{ 
                    responsive: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['zoom2d', 'resetScale2d', 'toImage', 'zoomIn2d', 'autoScale2d', 'select2d', 'lasso2d'],
                 }}
                className="w-full h-full"
                />
                </div>
            )
            )}
    </div>
    );
};
