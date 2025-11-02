import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, User, Calendar, Users, UserCheck, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorVerifyDialog } from "@/components/TwoFactorVerifyDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const signInSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const { user, signIn, verify2FA, signUp, signInWithGoogle, loading, needs2FA } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      emailOrUsername: "",
      password: "",
    },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      dateOfBirth: "",
      gender: "",
    },
  });

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Handle OAuth callback from Google
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if we have auth code or tokens in the URL (OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      if (urlParams.has('code') || hashParams.has('access_token')) {
        // This is likely an OAuth callback, let Supabase handle it
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('OAuth callback error:', error);
          toast({
            title: "Authentication Error", 
            description: error.message || "Failed to complete Google sign-in.",
            variant: "destructive",
          });
        } else if (data.session) {
          // Successfully authenticated via OAuth
          toast({
            title: "Welcome!",
            description: "You have successfully signed in with Google.",
          });
          navigate('/');
        }
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (!loading) {
      handleAuthCallback();
    }
  }, [loading, navigate, toast]);

  const onSignIn = async (values: z.infer<typeof signInSchema>) => {
    const { error, needs2FA: requires2FA } = await signIn(values.emailOrUsername, values.password);
    
    if (error) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } else if (requires2FA) {
      setShow2FADialog(true);
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate('/');
    }
  };

  const handle2FAVerify = async (code: string, trustDevice: boolean) => {
    setIsVerifying2FA(true);
    const { error } = await verify2FA(code, trustDevice);
    
    if (error) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
      setIsVerifying2FA(false);
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      setShow2FADialog(false);
      setIsVerifying2FA(false);
      navigate('/');
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        title: "Google Sign In Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const onSignUp = async (values: z.infer<typeof signUpSchema>) => {
    const { error } = await signUp(values.email, values.password, {
      username: values.username,
      date_of_birth: values.dateOfBirth,
      gender: values.gender,
      first_name: values.firstName,
      last_name: values.lastName,
    });
    
    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Please try again with different credentials.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen trust-gradient flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/logo.jpg" 
            alt="Nova Trading Logo" 
            className="w-16 h-16 mx-auto mb-4 rounded-2xl object-cover shadow-lg animate-pulse"
          />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen trust-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="auth-gradient border-primary/20 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-12 pb-8 text-center">
            <img 
              src="/logo.jpg" 
              alt="Nova Trading Logo" 
              className="w-20 h-20 mx-auto mb-6 rounded-3xl object-cover shadow-xl"
            />
            <h1 className="text-3xl font-bold text-foreground mb-3">
              {activeTab === "signin" ? "Welcome Back" : "Join Nova"}
            </h1>
            <p className="text-muted-foreground">
              {activeTab === "signin" 
                ? "Sign in to Nova" 
                : "Create your account to start trading"
              }
            </p>
          </div>

          <div className="px-8 pb-8">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-secondary/50 h-12">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-6">
                <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-6">
                  {/* Social Login Buttons */}
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      type="button" 
                      className="w-full h-12 bg-secondary/50 border-primary/20 hover:bg-secondary"
                      onClick={handleGoogleSignIn}
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>
                    <Button variant="outline" type="button" className="w-full h-12 bg-secondary/50 border-primary/20 hover:bg-secondary">
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Continue with Apple
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-primary/20" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email-username" className="text-foreground mb-2 block font-medium">Email or Username</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          id="signin-email-username"
                          type="text"
                          placeholder="Enter your email or username"
                          className="pl-10 h-12 bg-input border-primary/20 focus:border-primary"
                          {...signInForm.register("emailOrUsername")}
                        />
                      </div>
                      {signInForm.formState.errors.emailOrUsername && (
                        <p className="text-destructive text-sm mt-1">{signInForm.formState.errors.emailOrUsername.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="signin-password" className="text-foreground mb-2 block font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pl-10 pr-10 h-12 bg-input border-primary/20 focus:border-primary"
                          {...signInForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {signInForm.formState.errors.password && (
                        <p className="text-destructive text-sm mt-1">{signInForm.formState.errors.password.message}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                    disabled={signInForm.formState.isSubmitting}
                  >
                    {signInForm.formState.isSubmitting ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-6">
                <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-6">
                  {/* Social Login Buttons */}
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      type="button" 
                      className="w-full h-12 bg-secondary/50 border-primary/20 hover:bg-secondary"
                      onClick={handleGoogleSignIn}
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>
                    <Button variant="outline" type="button" className="w-full h-12 bg-secondary/50 border-primary/20 hover:bg-secondary">
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Continue with Apple
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-primary/20" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signup-firstname" className="text-foreground mb-2 block font-medium">First Name</Label>
                        <div className="relative">
                          <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                          <Input
                            id="signup-firstname"
                            type="text"
                            placeholder="First name"
                            className="pl-10 h-12 bg-input border-primary/20 focus:border-primary"
                            {...signUpForm.register("firstName")}
                          />
                        </div>
                        {signUpForm.formState.errors.firstName && (
                          <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.firstName.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="signup-lastname" className="text-foreground mb-2 block font-medium">Last Name</Label>
                        <div className="relative">
                          <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                          <Input
                            id="signup-lastname"
                            type="text"
                            placeholder="Last name"
                            className="pl-10 h-12 bg-input border-primary/20 focus:border-primary"
                            {...signUpForm.register("lastName")}
                          />
                        </div>
                        {signUpForm.formState.errors.lastName && (
                          <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signup-username" className="text-foreground mb-2 block font-medium">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          id="signup-username"
                          type="text"
                          placeholder="Choose a username"
                          className="pl-10 h-12 bg-input border-primary/20 focus:border-primary"
                          {...signUpForm.register("username")}
                        />
                      </div>
                      {signUpForm.formState.errors.username && (
                        <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.username.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="signup-email" className="text-foreground mb-2 block font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-12 bg-input border-primary/20 focus:border-primary"
                          {...signUpForm.register("email")}
                        />
                      </div>
                      {signUpForm.formState.errors.email && (
                        <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="signup-password" className="text-foreground mb-2 block font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="pl-10 pr-10 h-12 bg-input border-primary/20 focus:border-primary"
                          {...signUpForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {signUpForm.formState.errors.password && (
                        <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="signup-confirm-password" className="text-foreground mb-2 block font-medium">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="pl-10 pr-10 h-12 bg-input border-primary/20 focus:border-primary"
                          {...signUpForm.register("confirmPassword")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {signUpForm.formState.errors.confirmPassword && (
                        <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signup-dob" className="text-foreground mb-2 block font-medium">Date of Birth</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                          <Input
                            id="signup-dob"
                            type="date"
                            className="pl-10 h-12 bg-input border-primary/20 focus:border-primary"
                            {...signUpForm.register("dateOfBirth")}
                          />
                        </div>
                        {signUpForm.formState.errors.dateOfBirth && (
                          <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.dateOfBirth.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="signup-gender" className="text-foreground mb-2 block font-medium">Gender</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                          <select
                            id="signup-gender"
                            className="w-full pl-10 h-12 bg-input border border-primary/20 focus:border-primary rounded-md text-foreground"
                            {...signUpForm.register("gender")}
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer-not-to-say">Prefer not to say</option>
                          </select>
                        </div>
                        {signUpForm.formState.errors.gender && (
                          <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.gender.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                    disabled={signUpForm.formState.isSubmitting}
                  >
                    {signUpForm.formState.isSubmitting ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-8 text-center">
              <Link 
                to="/" 
                className="text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                
              </Link>
            </div>
          </div>
        </div>

        {/* 2FA Verification Dialog */}
        <TwoFactorVerifyDialog
          isOpen={show2FADialog}
          onVerify={handle2FAVerify}
          onCancel={() => setShow2FADialog(false)}
          isVerifying={isVerifying2FA}
        />
      </div>
    </div>
  );
};

export default Auth;
