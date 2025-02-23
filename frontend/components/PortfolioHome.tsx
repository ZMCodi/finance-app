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
    <div className="dark pl-3 pr-3">
      <Card className="w-auto mt-5">
        <CardHeader>
          <CardTitle>
            <button onClick={handleTitleClick} className="hover:text-blue-500 transition-colors">
              <span>Build or upload your portfolio</span>
            </button>
          </CardTitle>
          <CardDescription>track your investment performance</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetChart ticker='AAPL' plot_type="returns_distribution" height={300}/>
        </CardContent>
      </Card>
    </div>
  );
}