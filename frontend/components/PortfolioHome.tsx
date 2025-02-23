'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AssetChart from "@/components/AssetChart";
import { useRouter } from "next/navigation";

export default function PortfolioHome() {
  const router = useRouter();
  const handleTitleClick = () => {
    router.push('/portfolio');
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <button onClick={handleTitleClick} className="hover:text-blue-500 transition-colors">
            <span className="underline">Build or upload your portfolio</span>
          </button>
        </CardTitle>
        <CardDescription>track your investment performance</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-full">
          <AssetChart ticker='AAPL' plot_type="returns_distribution"/>
        </div>
      </CardContent>
    </Card>
  );
}