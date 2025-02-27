// app/strategy/components/SignalManagement.tsx
'use client';

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { IndicatorType } from "./IndicatorPanel";

interface SignalManagementProps {
  activeStrategies: Array<{ id: string; indicator: IndicatorType }>;
  signalData: Record<string, any>;
  onRemoveSignal: (strategyId: string) => void;
  timeframe: string;
}

export default function SignalManagement({
  activeStrategies,
  signalData,
  onRemoveSignal,
  timeframe,
}: SignalManagementProps) {
  // Filter strategies that have signals
  const strategiesWithSignals = activeStrategies.filter(
    (strategy) => signalData[strategy.id]
  );

  if (strategiesWithSignals.length === 0) {
    return null;
  }

  console.log(signalData);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-xs font-medium mr-1">Active Signals ({timeframe === '5m' ? '5-Min' : 'Daily'}):</span>
      {strategiesWithSignals.map((strategy) => (
        <div
          key={strategy.id}
          className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-1 text-xs"
        >
          <span>{strategy.indicator} Signal</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
            onClick={() => onRemoveSignal(strategy.id)}
            aria-label={`Remove ${strategy.indicator} signals`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}