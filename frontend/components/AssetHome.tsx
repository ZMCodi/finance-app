'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AssetChart from "@/components/AssetChart";
import { useRouter } from "next/navigation";

export default function AssetHome() {
  const router = useRouter();
  const handleTitleClick = () => {
    router.push('/assets');
  };

  return (
    <div className="dark m-auto w-[48.5%]">
      <Card className="w-full mt-5">
        <CardHeader>
          <CardTitle>
            <button onClick={handleTitleClick} className="hover:text-blue-500 transition-colors">
              <span>Look up assets</span>
            </button>
          </CardTitle>
          <CardDescription>do some analysis and shit</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetChart ticker='AAPL' plot_type="price_history" height={300}/>
        </CardContent>
      </Card>
    </div>
  );
}
