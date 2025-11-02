import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const country = req.headers.get('cf-ipcountry') || 'XX';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    let deviceData: any = null;
    let visitorId: string | null = null;
    let deviceName: string | null = null;
    try {
      const body = await req.text();
      if (body) {
        const parsed = JSON.parse(body);
        deviceData = parsed.device_data ?? null;
        visitorId = parsed.visitor_id ?? null;
        deviceName = parsed.device_name ?? null;
      }
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : '';
      console.log('Request body parse skipped:', msg);
    }

    if (deviceData) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabase.from('device_metadata').insert({
          visitor_id: visitorId,
          device_name: deviceName,
          country_code: country !== 'XX' ? country : null,
          ip_address: ip !== 'unknown' ? ip : null,
          user_agent: deviceData.user_agent,
          language: deviceData.language,
          platform: deviceData.platform,
          screen_width: deviceData.screen_width,
          screen_height: deviceData.screen_height,
          viewport_width: deviceData.viewport_width,
          viewport_height: deviceData.viewport_height,
          timezone: deviceData.timezone,
          color_depth: deviceData.color_depth,
          pixel_ratio: deviceData.pixel_ratio,
          device_memory: deviceData.device_memory,
          hardware_concurrency: deviceData.hardware_concurrency,
          connection_type: deviceData.connection_type,
          connection_downlink: deviceData.connection_downlink,
          online: deviceData.online,
          cookies_enabled: deviceData.cookies_enabled,
          do_not_track: deviceData.do_not_track,
          touch_support: deviceData.touch_support,
          max_touch_points: deviceData.max_touch_points,
          vendor: deviceData.vendor,
          languages: deviceData.languages,
          screen_orientation: deviceData.screen_orientation,
          available_screen_width: deviceData.available_screen_width,
          available_screen_height: deviceData.available_screen_height,
          collected_at: deviceData.timestamp
        });
      } catch (dbError) {
        console.error('Failed to store device metadata:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ country_code: country, ip, metadata_stored: !!deviceData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error detecting country:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ country_code: 'XX', error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
