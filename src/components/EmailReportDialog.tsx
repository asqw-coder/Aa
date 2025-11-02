import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, Loader2, Save, Clock } from "lucide-react";

interface EmailReportDialogProps {
  reportData: {
    totalPnL: number;
    dailyTrades: number;
    winRate: number;
    trades: Array<{
      symbol: string;
      type: string;
      pnl: number;
      confidence: number;
      model: string;
      timestamp: string;
    }>;
    modelPerformance: Array<{
      name: string;
      accuracy: number;
      profit: number;
      trades: number;
    }>;
    dailyPnL: Array<{
      hour: string;
      pnl: number;
    }>;
    symbolAnalysis: Array<{
      symbol: string;
      trades: number;
      winRate: number;
      totalPnL: number;
    }>;
  };
}

export const EmailReportDialog = ({ reportData }: EmailReportDialogProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [saveEmail, setSaveEmail] = useState(false);
  const [autoReport, setAutoReport] = useState(false);
  const { toast } = useToast();

  // Load saved email and preferences on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('trading-report-email');
    const savedAutoReport = localStorage.getItem('auto-report-enabled') === 'true';
    
    if (savedEmail) {
      setEmail(savedEmail);
      setSaveEmail(true);
    }
    setAutoReport(savedAutoReport);
  }, []);

  const handleSendReport = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (!email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-trading-report', {
        body: {
          email,
          reportData
        }
      });

      if (error) throw error;

      // Save email and preferences if requested
      if (saveEmail) {
        localStorage.setItem('trading-report-email', email);
        localStorage.setItem('auto-report-enabled', autoReport.toString());
      }

      toast({
        title: "Report Sent!",
        description: `Daily trading report sent to ${email}`,
      });

      setIsOpen(false);
      if (!saveEmail) {
        setEmail("");
      }
    } catch (error: any) {
      console.error("Error sending report:", error);
      
      // If auto-report is enabled, save the failed report for retry
      if (autoReport && saveEmail) {
        const failedReport = {
          email,
          reportData,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };
        
        const existingFailedReports = JSON.parse(localStorage.getItem('failed-reports') || '[]');
        existingFailedReports.push(failedReport);
        localStorage.setItem('failed-reports', JSON.stringify(existingFailedReports));
        
        toast({
          title: "Report Queued for Retry",
          description: "Report will be automatically retried later",
          variant: "default",
        });
      } else {
        toast({
          title: "Failed to Send Report",
          description: error.message || "An error occurred while sending the report",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Email Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Daily Trading Report
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Save className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="save-email" className="text-sm">Save email for future reports</Label>
              </div>
              <Switch
                id="save-email"
                checked={saveEmail}
                onCheckedChange={setSaveEmail}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="auto-report" className="text-sm">Enable auto-reports with retry</Label>
              </div>
              <Switch
                id="auto-report"
                checked={autoReport}
                onCheckedChange={setAutoReport}
                disabled={isLoading || !saveEmail}
              />
            </div>
            
            {autoReport && saveEmail && (
              <div className="bg-muted/30 rounded-md p-3">
                <p className="text-xs text-muted-foreground">
                  Auto-reports will attempt to send daily reports automatically. 
                  Failed reports will be queued for retry.
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Report will include:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Daily P&L summary and performance metrics</li>
              <li>• AI model performance analysis</li>
              <li>• Symbol-by-symbol trading breakdown</li>
              <li>• Recent trades and key insights</li>
              <li>• Professional HTML formatting</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReport}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isLoading ? "Sending..." : "Send Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};