'use client';

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface TickerInputProps {
  onAddTicker: (ticker: string) => void;
}

export default function TickerInput({ onAddTicker }: TickerInputProps) {
  const [newTicker, setNewTicker] = useState('');

  const handleAddTicker = () => {
    if (newTicker) {
      onAddTicker(newTicker.toUpperCase());
      setNewTicker('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTicker();
    }
  };

  return (
    <div className="flex gap-2 max-w-md mx-auto mt-6 mb-8">
      <Input
        placeholder="Enter ticker symbol (e.g. AAPL)"
        value={newTicker}
        onChange={(e) => setNewTicker(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <Button onClick={handleAddTicker}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Add
      </Button>
    </div>
  );
}