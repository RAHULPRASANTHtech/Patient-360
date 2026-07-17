import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Smartphone, KeyRound, Loader2, UserCircle, Shield, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { role, userId, userName } = useAuth();
  const { toast } = useToast();

  // OTP States
  const [otpStep, setOtpStep] = useState<"idle" | "sent">("idle");
  const [otpValue, setOtpValue] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const handleRequestOTP = async () => {
    setIsOtpLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || "Failed to send OTP");
      
      setOtpStep("sent");
      toast({ title: "OTP Sent", description: "Check your mobile device (Terminal) for the code.", className: "bg-emerald-600 text-white border-none" });
    } catch (error: any) {
      toast({ title: "Security Alert", description: error.message, variant: "destructive" });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    
    setIsOtpLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, otp: otpValue, new_password: newPassword })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || "Failed to reset password");
      
      setOtpStep("idle");
      setOtpValue("");
      setNewPassword("");
      toast({ title: "Password Updated", description: "Your account is secure.", className: "bg-emerald-600 text-white border-none" });
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">My Profile</h2>
        <p className="text-muted-foreground text-sm">Manage your account identity and security settings.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* IDENTITY CARD (Matches any user role) */}
        <Card className="border-border shadow-md md:col-span-1 h-fit">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <UserCircle className="h-16 w-16" />
            </div>
            <div>
              <h3 className="font-bold text-xl">{userName || "System User"}</h3>
              <div className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-md mt-2 border border-border">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{role?.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="w-full pt-4 border-t border-border mt-2 space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" /> Account ID: <span className="font-mono text-foreground font-medium">{userId}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECURITY & PASSWORD RESET CARD */}
        <Card className="border-border shadow-md md:col-span-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <Lock className="h-5 w-5 text-primary" />
              Account Security Center
            </CardTitle>
            <CardDescription>Update your system password using multi-factor authentication.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-w-md space-y-4">
              <p className="text-sm text-muted-foreground">
                To reset your password, we will send a highly secure 6-digit One Time Password (OTP) to your registered device. 
                <br/><span className="text-xs font-bold text-destructive">Security Policy: Limited to 2 resets per 24 hours.</span>
              </p>
              
              {otpStep === "idle" ? (
                <Button onClick={handleRequestOTP} disabled={isOtpLoading} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                  {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
                  Send OTP to Mobile
                </Button>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 bg-muted/20 p-4 rounded-lg border border-border">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Enter 6-Digit OTP</label>
                    <Input 
                      type="text" 
                      maxLength={6}
                      placeholder="• • • • • •" 
                      value={otpValue} 
                      onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                      className="font-mono tracking-widest text-lg bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Secure Password</label>
                    <Input 
                      type="password" 
                      placeholder="Enter new password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      className="bg-background"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleResetPassword} disabled={isOtpLoading || otpValue.length !== 6} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                      Confirm & Update
                    </Button>
                    <Button variant="outline" onClick={() => setOtpStep("idle")}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </motion.div>
    </div>
  );
}