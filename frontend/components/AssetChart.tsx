'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartArea } from "lucide-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

interface PlotlyData {
    data: any[];
    layout: any;
}

interface AssetChartProps {
    ticker: string;
    plot_type: 'price_history' | 'candlestick' | 'returns_distribution' | 'SMA';
}

const Plot = dynamic(() => import("react-plotly.js"), {
    ssr: false,
    loading: () => <div>Loading...</div>, 
});

export default function AssetChart({ ticker, plot_type }: AssetChartProps) {
    const [plotData, setPlotData] = useState<PlotlyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    const fetchData = async () => {
        try {
        const response = await fetch(`http://localhost:8000/api/assets/${ticker}/${plot_type}`);
        const data = await response.json();
        setPlotData(data.json_data);
        console.log(data.json_data);
        } catch (error) {
        console.error("Error fetching data:", error);
        } finally {
        setLoading(false);
        }
    };
    fetchData();
    }, [ticker, plot_type]);

    return (
    <div>
        <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <ChartArea />
            <p>This is a card</p>
            </CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? (
            <div>Loading...</div>
            ) : (
            plotData && (
                <Plot 
                data={plotData.data}
                layout={{
                    ...plotData.layout,
                    autosize: true,
                    margin: { t: 20, r: 20, b: 30, l: 40 },
                    height: 400,
                }}
                config={{ responsive: true }}
                className="w-full h-full"
                />
            )
            )}
        </CardContent>
        </Card>
    </div>
    );
};
