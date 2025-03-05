'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { AssetResponse } from '@/src/api';

export default function AssetTitle({ ticker }: { ticker: string }) {
    const [asset, setAsset] = useState<AssetResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAsset = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets/${ticker}`);
                const data: AssetResponse = await response.json();
                setAsset(data);
            } catch (error) {
                console.error('Error fetching asset:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAsset();
    }, [ticker]);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex items-center space-x-2 pb-3">
            <h1 className="text-2xl font-bold">{ticker} Analysis</h1>
            {asset && (
                <>
                <Badge color='white' variant='outline'>
                    {asset.asset_type}
                </Badge>
                { asset.sector !== asset.asset_type && asset.sector &&
                <Badge color='white' variant='outline'>
                    {asset.sector}
                </Badge>
                }
                <Badge color='white' variant='outline'>
                    {asset.currency}
                </Badge>
                </>
            )}
        </div>
    )
}