import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database } from 'lucide-react';

interface TradingSymbolsCardProps {
  selectedSymbols: string[];
  setSelectedSymbols: (symbols: string[] | ((prev: string[]) => string[])) => void;
  defaultSymbols: string[];
}

export const TradingSymbolsCard = ({ 
  selectedSymbols, 
  setSelectedSymbols, 
  defaultSymbols 
}: TradingSymbolsCardProps) => {
  const [customSymbol, setCustomSymbol] = useState('');

  const addSymbol = () => {
    if (customSymbol && !selectedSymbols.includes(customSymbol)) {
      setSelectedSymbols(prev => [...prev, customSymbol]);
      setCustomSymbol('');
    }
  };

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
  };

  const resetToDefaults = () => {
    setSelectedSymbols(defaultSymbols);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Selected Trading Symbols ({selectedSymbols.length})</Label>
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
          {selectedSymbols.map(symbol => (
            <Badge 
              key={symbol} 
              variant="secondary" 
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => removeSymbol(symbol)}
            >
              {symbol} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Add Custom Symbol</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom symbol (e.g., AUD_USD)"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
          />
          <Button onClick={addSymbol} disabled={!customSymbol}>
            Add Symbol
          </Button>
        </div>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          The bot will use historical data for these symbols to train ML models and execute trades.
          Common symbols: EUR_USD, GBP_USD, USD_JPY, BTC_USD, ETH_USD, XAU_USD
        </AlertDescription>
      </Alert>
    </div>
  );
};