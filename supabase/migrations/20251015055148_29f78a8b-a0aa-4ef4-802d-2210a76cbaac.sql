-- Fix get_current_ark_id to fetch from profiles instead of generating new ID
CREATE OR REPLACE FUNCTION public.get_current_ark_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ark_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$function$;