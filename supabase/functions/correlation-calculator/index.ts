// Phase 6: Real Correlation Risk Assessment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  symbols: z.array(z.string()).min(1),
  days: z.number().int().positive().optional().default(30)
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const body = await req.json();
    const validationResult = inputSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { symbols, days } = validationResult.data;

    console.log(`Calculating correlations for ${symbols.length} symbols over ${days} days`);

    // Fetch historical price data for all symbols
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const priceData: Record<string, number[]> = {};
    
    for (const symbol of symbols) {
      const { data, error } = await supabase
        .from('market_data_cache')
        .select('bid, ask, timestamp')
        .eq('symbol', symbol)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error || !data || data.length === 0) {
        console.log(`No data for ${symbol}, skipping`);
        continue;
      }

      // Calculate mid prices
      priceData[symbol] = data.map((d: any) => (d.bid + d.ask) / 2);
    }

    // Calculate Pearson correlation coefficient for each pair
    const correlationMatrix: Record<string, number> = {};

    const symbolsWithData = Object.keys(priceData);
    
    for (let i = 0; i < symbolsWithData.length; i++) {
      for (let j = i + 1; j < symbolsWithData.length; j++) {
        const symbol1 = symbolsWithData[i];
        const symbol2 = symbolsWithData[j];
        
        const prices1 = priceData[symbol1];
        const prices2 = priceData[symbol2];
        
        // Ensure same length
        const minLength = Math.min(prices1.length, prices2.length);
        if (minLength < 10) continue; // Need at least 10 data points
        
        const p1 = prices1.slice(-minLength);
        const p2 = prices2.slice(-minLength);
        
        // Calculate correlation
        const correlation = calculatePearsonCorrelation(p1, p2);
        
        correlationMatrix[`${symbol1}_${symbol2}`] = correlation;
      }
    }

    // Store correlations in symbol_stats table
    for (const symbol of symbolsWithData) {
      await supabase.from('symbol_stats').upsert({
        symbol,
        date: new Date().toISOString().split('T')[0],
        correlation_matrix: correlationMatrix,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'symbol,date'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        correlationMatrix,
        symbolsProcessed: symbolsWithData.length,
        message: 'Correlation matrix calculated and stored'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Correlation calculation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred calculating correlations' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  
  // Calculate means
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  // Calculate covariance and standard deviations
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    
    covariance += diffX * diffY;
    varianceX += diffX * diffX;
    varianceY += diffY * diffY;
  }
  
  const stdDevX = Math.sqrt(varianceX / n);
  const stdDevY = Math.sqrt(varianceY / n);
  
  if (stdDevX === 0 || stdDevY === 0) return 0;
  
  return covariance / (n * stdDevX * stdDevY);
}
