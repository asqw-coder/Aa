import { X, AlertCircle, Info, Wrench, FileText, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSystemBroadcasts } from '@/hooks/useSystemBroadcasts';
import { cn } from '@/lib/utils';

const getBroadcastIcon = (type: string) => {
  switch (type) {
    case 'urgent':
      return AlertTriangle;
    case 'maintenance':
      return Wrench;
    case 'update':
      return Info;
    case 'terms_change':
      return FileText;
    default:
      return AlertCircle;
  }
};

const getBroadcastVariant = (priority: string): 'default' | 'destructive' => {
  return priority === 'critical' ? 'destructive' : 'default';
};

export const SystemBroadcastBanner = () => {
  const { broadcasts, dismissBroadcast } = useSystemBroadcasts();

  if (broadcasts.length === 0) return null;

  const activeBroadcast = broadcasts[0]; // Show most recent broadcast
  const Icon = getBroadcastIcon(activeBroadcast.type);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
      <Alert 
        variant={getBroadcastVariant(activeBroadcast.priority)} 
        className={cn(
          "rounded-none border-x-0 border-t-0",
          activeBroadcast.priority === 'critical' && "bg-destructive text-destructive-foreground [&>svg]:text-destructive-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          {activeBroadcast.title}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6",
              activeBroadcast.priority === 'critical' && "hover:bg-destructive-foreground/20 text-destructive-foreground"
            )}
            onClick={() => dismissBroadcast(activeBroadcast.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription>
          {activeBroadcast.message}
        </AlertDescription>
      </Alert>
    </div>
  );
};
