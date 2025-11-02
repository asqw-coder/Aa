import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  ark_id: string;
  created_at: string;
  updated_at: string;
}

export const AdminReportsManager = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();

    // Subscribe to new reports
    const channel = supabase
      .channel('admin-reports')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_reports'
        },
        (payload) => {
          setReports((prev) => [payload.new as Report, ...prev]);
          toast({
            title: 'New Report',
            description: 'A new user report has been submitted',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('user_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      setReports(data || []);
    }
    setIsLoading(false);
  };

  const updateReportStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('user_reports')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update report status',
        variant: 'destructive',
      });
    } else {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      toast({
        title: 'Success',
        description: 'Report status updated',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'bg-red-500';
      case 'feature_request': return 'bg-purple-500';
      case 'technical_issue': return 'bg-orange-500';
      case 'account_issue': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return <div>Loading reports...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>User Reports</CardTitle>
        </div>
        <CardDescription>
          View and manage user-submitted issue reports in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reports yet</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{report.title}</h3>
                      <Badge className={getCategoryColor(report.category)}>
                        {report.category.replace('_', ' ')}
                      </Badge>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">{report.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>ARK ID: {report.ark_id}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(report.created_at), 'PPp')}
                      </span>
                    </div>
                  </div>
                  <Select
                    value={report.status}
                    onValueChange={(value) => updateReportStatus(report.id, value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
