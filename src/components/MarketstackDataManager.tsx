import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Database, Calendar, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const MarketstackDataManager = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [interval, setInterval] = useState<'eod' | 'intraday'>('eod');
  const [intradayInterval, setIntradayInterval] = useState<'1min' | '5min' | '15min' | '30min' | '1hour'>('1hour');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [symbols, setSymbols] = useState('');
  const [downloadResult, setDownloadResult] = useState<any>(null);

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please provide both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (!symbols.trim()) {
      toast({
        title: "Missing symbols",
        description: "Please provide at least one stock symbol",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setDownloadResult(null);

    try {
      const symbolList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

      console.log('Invoking marketstack-data-fetcher with:', {
        symbols: symbolList,
        dateFrom: startDate,
        dateTo: endDate,
        interval,
        intradayInterval: interval === 'intraday' ? intradayInterval : undefined,
      });

      const { data, error } = await supabase.functions.invoke('marketstack-data-fetcher', {
        body: {
          symbols: symbolList,
          dateFrom: startDate,
          dateTo: endDate,
          interval: interval,
          intradayInterval: interval === 'intraday' ? intradayInterval : undefined,
        },
      });

      console.log('Response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to fetch data from Marketstack API');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to download historical data');
      }

      setDownloadResult(data);

      toast({
        title: "Download complete",
        description: `Processed ${data.processedFiles} symbols with ${data.totalRecords} records`,
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Marketstack Historical Data Manager
        </CardTitle>
        <CardDescription>
          Download historical market data from Marketstack API for ML training
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This fetches historical stock market data from Marketstack API. Make sure your API key is configured in the edge function.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="interval">Data Interval</Label>
            <Select value={interval} onValueChange={(v: any) => setInterval(v)}>
              <SelectTrigger id="interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eod">End of Day (EOD)</SelectItem>
                <SelectItem value="intraday">Intraday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {interval === 'intraday' && (
            <div className="space-y-2">
              <Label htmlFor="intradayInterval">Intraday Interval</Label>
              <Select value={intradayInterval} onValueChange={(v: any) => setIntradayInterval(v)}>
                <SelectTrigger id="intradayInterval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1min">1 Minute</SelectItem>
                  <SelectItem value="5min">5 Minutes</SelectItem>
                  <SelectItem value="15min">15 Minutes</SelectItem>
                  <SelectItem value="30min">30 Minutes</SelectItem>
                  <SelectItem value="1hour">1 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="startDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="symbols">Stock Symbols (required)</Label>
          <Input
            id="symbols"
            placeholder="AAPL, GOOGL, MSFT (comma-separated)"
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Enter stock ticker symbols separated by commas
          </p>
        </div>

        <Button 
          onClick={handleDownload} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading and Processing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Historical Data
            </>
          )}
        </Button>

        {downloadResult && (
          <Alert>
            <AlertDescription className="space-y-1">
              <p className="font-semibold">Download Results:</p>
              <p>Files Processed: {downloadResult.processedFiles}</p>
              <p>Total Records: {downloadResult.totalRecords?.toLocaleString()}</p>
              <p>Date Range: {downloadResult.dateRange.start} to {downloadResult.dateRange.end}</p>
              {downloadResult.errors && downloadResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-destructive font-semibold">Errors:</p>
                  <ul className="text-sm list-disc list-inside">
                    {downloadResult.errors.slice(0, 5).map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
