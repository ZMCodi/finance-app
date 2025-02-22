import AssetChart from "@/components/AssetChart"

export default function Home() {

  return (
    <div>
      <h1 className="text-xl text-center pt-5">Finance App</h1>
      <h5 className="text-sm text-center pt-2">I&apos;ll have to workshop the name.</h5>
      <AssetChart ticker='AAPL' plot_type="price_history"/>
      <AssetChart ticker='MSFT' plot_type="price_history"/>
      <AssetChart ticker='NVDA' plot_type="price_history"/>
    </div>
  )
}