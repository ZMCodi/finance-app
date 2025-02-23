import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AssetStats {
  returns: {
    total_return: number;
    daily_mean: number;
    daily_std: number;
    daily_median: number;
    annualized_vol: number;
    annualized_ret: number;
  };
  price: {
    high: number;
    low: number;
    '52w_high': number;
    '52w_low': number;
    current: number;
  };
  distribution: {
    mean: number;
    std: number;
    skewness: number;
    kurtosis: number;
  };
}

interface AssetInfoProps {
  ticker: string;
}

export default function AssetInfo({ ticker }: AssetInfoProps) {
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/assets/${ticker}/stats`);
        const data = await response.json();
        setStats(data.stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [ticker]);
  console.log(stats);
  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>No stats available</div>;

  const formatPercent = (value: number) => (value * 100).toFixed(2) + '%';
  const formatPrice = (value: number) => '$' + value.toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Price Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt>Current</dt>
              <dd>{formatPrice(stats.price.current)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>52 Week High</dt>
              <dd>{formatPrice(stats.price['52w_high'])}</dd>
            </div>
            <div className="flex justify-between">
              <dt>52 Week Low</dt>
              <dd>{formatPrice(stats.price['52w_low'])}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt>Total Return</dt>
              <dd>{formatPercent(stats.returns.total_return)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Annualized Return</dt>
              <dd>{formatPercent(stats.returns.annualized_ret)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Annualized Volatility</dt>
              <dd>{formatPercent(stats.returns.annualized_vol)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt>Mean</dt>
              <dd>{formatPercent(stats.distribution.mean)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Standard Deviation</dt>
              <dd>{formatPercent(stats.distribution.std)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Skewness</dt>
              <dd>{stats.distribution.skewness.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Kurtosis</dt>
              <dd>{stats.distribution.kurtosis.toFixed(2)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}