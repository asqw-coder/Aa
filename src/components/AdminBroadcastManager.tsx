import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Megaphone } from 'lucide-react';

export const AdminBroadcastManager = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'announcement' | 'maintenance' | 'update' | 'terms_change' | 'urgent'>('announcement');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [maxViews, setMaxViews] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create broadcasts',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('system_broadcasts')
      .insert({
        title,
        message,
        type,
        priority,
        max_views_per_user: maxViews,
        expires_at: expiresAt || null,
        created_by: user.id,
      });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create broadcast. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Broadcast sent to all users',
      });
      setTitle('');
      setMessage('');
      setType('announcement');
      setPriority('normal');
      setMaxViews(1);
      setExpiresAt('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          <CardTitle>System Broadcast</CardTitle>
        </div>
        <CardDescription>
          Send real-time announcements to all users about maintenance, updates, or important changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="terms_change">Terms Change</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Broadcast title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Broadcast message"
              className="min-h-[100px]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxViews">Maximum Views Per User</Label>
              <Input
                id="maxViews"
                type="number"
                min="1"
                value={maxViews}
                onChange={(e) => setMaxViews(parseInt(e.target.value) || 1)}
                placeholder="How many times each user can see this"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                placeholder="Leave empty for no expiration"
              />
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
