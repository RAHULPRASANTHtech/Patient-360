import { useState } from "react";
import { useAuth } from "@/context/AuthContext"; 
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Stethoscope, User, ClipboardList, UserPlus, FlaskConical, Loader2, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LoginScreen = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Standard Login States
  const [selectedRole, setSelectedRole] = useState<"doctor" | "nurse" | "patient" | "receptionist" | "lab_technician" | "admin" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password States
  const [isResetMode, setIsResetMode] = useState(false);
  const [otpStep, setOtpStep] = useState<"idle" | "sent">("idle");
  const [otpValue, setOtpValue] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleLogin = async(e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedRole || !email || !password) {
      setError("Please fill all required fields and select a role.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole }),
      });
      const data = await response.json();
      if(!response.ok) throw new Error(data.detail || "Login failed");
      
      login(data.user.role, data.user.email, data.user.id);
      navigate("/"); 
    } catch(err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email to request an OTP.");
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch('http://localhost:8000/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to send OTP");
      
      setOtpStep("sent");
      toast({ title: "OTP Sent", description: "Check your mobile device.", className: "bg-emerald-600 text-white" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch('http://localhost:8000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpValue, new_password: newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to reset");
      
      toast({ title: "Success!", description: "Password updated. Please log in.", className: "bg-emerald-600 text-white" });
      setIsResetMode(false);
      setOtpStep("idle");
      setPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md px-4">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">MedGuard</h1>
          <p className="mt-1 text-muted-foreground">Patient 360° — Secure Gatekeeper</p>
        </div>

        <Card className="border-border shadow-lg overflow-hidden">
          <AnimatePresence mode="wait">
            {!isResetMode ? (
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <CardHeader>
                  <CardTitle className="text-center text-lg">Select Gatekeeper Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Role Selection Blocks */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setSelectedRole("doctor")} className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all text-center ${selectedRole === "doctor" ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
                  <Stethoscope className="h-6 w-6 text-primary" /> <span className="text-xs font-medium text-foreground">Doctor</span>
                </button>
                <button type="button" onClick={() => setSelectedRole("nurse")} className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all text-center ${selectedRole === "nurse" ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
                  <ClipboardList className="h-6 w-6 text-primary" /> <span className="text-xs font-medium text-foreground">Nurse</span>
                </button>
                <button type="button" onClick={() => setSelectedRole("receptionist")} className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all text-center ${selectedRole === "receptionist" ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
                  <UserPlus className="h-6 w-6 text-primary" /> <span className="text-xs font-medium text-foreground">Receptionist</span>
                </button>
                <button type="button" onClick={() => setSelectedRole("patient")} className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all text-center ${selectedRole === "patient" ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
                  <User className="h-6 w-6 text-primary" /> <span className="text-xs font-medium text-foreground">Patient</span>
                </button>
                <button type="button" onClick={() => setSelectedRole("lab_technician")} className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all text-center ${selectedRole === "lab_technician" ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
                  <FlaskConical className="h-6 w-6 text-primary" /> <span className="text-xs font-medium text-foreground">Lab Tech</span>
                </button>
                
                {/* NEW ADMIN BUTTON */}
                <button type="button" onClick={() => setSelectedRole("admin")} className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all text-center ${selectedRole === "admin" ? "border-slate-800 bg-slate-100" : "border-border hover:border-slate-800/40"}`}>
                  <Shield className="h-6 w-6 text-slate-800" /> <span className="text-xs font-medium text-foreground">Sys Admin</span>
                </button>
              </div>

                    {error && <p className="text-xs font-medium text-destructive text-center bg-destructive/10 py-2 rounded">{error}</p>}

                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.com" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Secure Password</Label>
                        <button type="button" onClick={() => { setIsResetMode(true); setError(""); setOtpStep("idle"); }} className="text-xs text-primary font-medium hover:underline">Forgot password?</button>
                      </div>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full mt-2" size="lg">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In Protocol"}
                    </Button>
                  </form>
                </CardContent>
              </motion.div>
            ) : (
              <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <CardHeader>
                  <CardTitle className="text-center text-lg flex items-center justify-center gap-2"><KeyRound className="h-5 w-5 text-primary"/> Reset Password</CardTitle>
                  <CardDescription className="text-center">Enter your email to receive a secure OTP.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={otpStep === "idle" ? handleRequestOTP : handleResetPassword} className="space-y-4">
                    {error && <p className="text-xs font-medium text-destructive text-center bg-destructive/10 py-2 rounded">{error}</p>}
                    
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.com" disabled={otpStep === "sent"} />
                    </div>

                    {otpStep === "sent" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>6-Digit OTP</Label>
                          <Input maxLength={6} value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))} placeholder="• • • • • •" className="font-mono tracking-widest text-center text-lg" />
                        </div>
                        <div className="space-y-2">
                          <Label>New Password</Label>
                          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
                        </div>
                      </motion.div>
                    )}

                    <div className="pt-2 space-y-2">
                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : otpStep === "idle" ? "Send OTP" : "Reset Password"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setIsResetMode(false)} className="w-full">Back to Login</Button>
                    </div>
                  </form>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginScreen;

