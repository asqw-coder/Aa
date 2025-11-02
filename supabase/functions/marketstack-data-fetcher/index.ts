import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const MARKETSTACK_API_KEY = Deno.env.get('MARKETSTACK_API_KEY');
    if (!MARKETSTACK_API_KEY) {
      throw new Error('MARKETSTACK_API_KEY not configured');
    }

    const { symbols, dateFrom, dateTo, interval, intradayInterval } = await req.json();

    if (!symbols || symbols.length === 0) {
      throw new Error('At least one symbol is required');
    }

    let totalRecords = 0;
    const errors: string[] = [];
    const symbolsProcessed = [];

    for (const symbol of symbols) {
      try {
        console.log(`Fetching ${interval} data for ${symbol} from ${dateFrom} to ${dateTo}`);

        let endpoint = 'eod';
        const params = new URLSearchParams({
          access_key: MARKETSTACK_API_KEY,
          symbols: symbol,
          date_from: dateFrom,
          date_to: dateTo,
          limit: '1000',
        });

        if (interval === 'intraday') {
          endpoint = 'intraday';
          if (intradayInterval) {
            params.append('interval', intradayInterval);
          }
        }

        const url = `https://api.marketstack.com/v1/${endpoint}?${params.toString()}`;
        console.log(`Fetching from: ${url.replace(MARKETSTACK_API_KEY, '***')}`);

        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Marketstack API error (${response.status}): ${errorText}`);
        }

        const marketData = await response.json();
        
        if (!marketData.data || marketData.data.length === 0) {
          console.log(`No data returned for ${symbol}`);
          continue;
        }

        console.log(`Received ${marketData.data.length} records for ${symbol}`);

        // Store data in historical_data_cache table
        for (const candle of marketData.data) {
          try {
            const { error: insertError } = await supabaseClient
              .from('historical_data_cache')
              .upsert({
                symbol: symbol,
                timestamp: candle.date,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volume || 0,
              }, {
                onConflict: 'symbol,timestamp',
              });

            if (insertError) {
              console.error(`Error inserting data for ${symbol}:`, insertError);
              errors.push(`${symbol}: ${insertError.message}`);
            } else {
              totalRecords++;
            }
          } catch (insertErr) {
            console.error(`Exception inserting data for ${symbol}:`, insertErr);
            errors.push(`${symbol}: ${insertErr instanceof Error ? insertErr.message : 'Unknown error'}`);
          }
        }

        symbolsProcessed.push(symbol);
      } catch (symbolError) {
        const errorMsg = symbolError instanceof Error ? symbolError.message : 'Unknown error';
        console.error(`Error processing ${symbol}:`, errorMsg);
        errors.push(`${symbol}: ${errorMsg}`);
      }
    }

    const result = {
      success: true,
      processedFiles: symbolsProcessed.length,
      totalRecords,
      dateRange: {
        start: dateFrom,
        end: dateTo,
      },
      symbols: symbolsProcessed,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Fetch complete:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in marketstack-data-fetcher:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
