import ChartContainer from "@/components/ChartContainer";

export default function Home() {
  return (
    <div className="dark p-4">
      <h1 className="text-xl text-center pt-5">Search a ticker</h1>
      <h5 className="text-sm text-center pt-2">And look at the charts for it</h5>
      <ChartContainer />
    </div>
  );
}