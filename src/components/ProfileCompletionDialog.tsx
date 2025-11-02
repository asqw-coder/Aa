import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
  birth_day: z.string().min(1, 'Please select day'),
  birth_month: z.string().min(1, 'Please select month'),
  birth_year: z.string().min(1, 'Please select year'),
  gender: z.string().min(1, 'Please select your gender'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileCompletionDialogProps {
  isOpen: boolean;
  onComplete: () => void;
  currentProfile: {
    username: string;
    first_name?: string;
    last_name?: string;
    user_id: string;
  };
}

export const ProfileCompletionDialog: React.FC<ProfileCompletionDialogProps> = ({
  isOpen,
  onComplete,
  currentProfile
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const { toast } = useToast();
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: currentProfile.username || '',
      birth_day: '',
      birth_month: '',
      birth_year: '',
      gender: '',
    },
  });

  // Generate options for dropdowns
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => String(currentYear - i));

  const checkUsernameAvailability = async (username: string) => {
    if (username === currentProfile.username) return true; // Same username is fine
    
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .neq('user_id', currentProfile.user_id);
      
    if (error) {
      console.error('Error checking username:', error);
      return false;
    }
    
    return data.length === 0;
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setUsernameError('');

    try {
      // Check username availability
      const isUsernameAvailable = await checkUsernameAvailability(data.username);
      if (!isUsernameAvailable) {
        setUsernameError('This username is already taken');
        setIsSubmitting(false);
        return;
      }

      // Construct date of birth from individual fields
      const dateOfBirth = `${data.birth_year}-${data.birth_month.padStart(2, '0')}-${data.birth_day.padStart(2, '0')}`;

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          date_of_birth: dateOfBirth,
          gender: data.gender,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', currentProfile.user_id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to update profile. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Profile completed!',
        description: 'Your profile has been successfully updated.',
      });

      onComplete();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-foreground">
            Complete Your Profile
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Welcome {currentProfile.first_name}! Please complete your profile to get started.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Username Field */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Choose a unique username"
                      className="bg-background border-border"
                    />
                  </FormControl>
                  {usernameError && (
                    <p className="text-sm text-destructive">{usernameError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date of Birth Field */}
            <div className="space-y-2">
              <FormLabel>Date of Birth</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {/* Day */}
                <FormField
                  control={form.control}
                  name="birth_day"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-border max-h-[200px]">
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Month */}
                <FormField
                  control={form.control}
                  name="birth_month"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-border max-h-[200px]">
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Year */}
                <FormField
                  control={form.control}
                  name="birth_year"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-border max-h-[200px]">
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Gender Field */}
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Completing Profile...' : 'Complete Profile'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};