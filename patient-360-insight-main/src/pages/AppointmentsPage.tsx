import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AppointmentsPage() {
  const { role, userName, userId } = useAuth();
  const { toast } = useToast();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // OTP Modal States
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Live Appointments
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/appointments');
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      toast({ title: "Database Error", description: "Could not load appointments.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

 // 2. Enterprise Role-Based Visibility Filters
  const visibleAppointments = appointments.filter(a => {
    if (role === "receptionist") return true; // Gatekeeper sees all
    
    // MATCH BY SECURE ID INSTEAD OF NAME string
    if (role === "doctor" || role === "nurse") return a.doctorId === userId; 
    if (role === "patient") return a.patientId === userId; 
    
    return false;
  });

// 3. Action Handlers (Wired to Live Python Routes)
  const handleCancelAppointment = async (apptId: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: apptId,
          patient_id: userId
        })
      });

      if (!response.ok) throw new Error("Could not cancel appointment");
      
      toast({ title: "Appointment Cancelled", description: "The schedule has been updated." });
      fetchAppointments(); // Refresh the table automatically
    } catch (error) {
      toast({ title: "Error", description: "Cancellation failed.", variant: "destructive" });
    }
  };

  const handleCompleteWithOTP = async (e: React.FormEvent, apptId: string) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/appointments/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: apptId,
          otp_code: otpInput,
          doctor_id: userId
        })
      });

      const data = await response.json();

      // If Python rejects the OTP, throw an error!
      if (!response.ok) {
        throw new Error(data.detail || "Invalid OTP Handshake.");
      }

      // Success!
      toast({ title: "OTP Verified!", description: "Appointment securely marked as completed." });
      setSelectedApptId(null);
      setOtpInput("");
      fetchAppointments(); // Refresh the table to show the new "Completed" status

    } catch (error: any) {
      // Show the red error toast if the Doctor types the wrong code
      toast({ title: "Handshake Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Loading Enterprise Schedule...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Live Schedule</h2>
          <p className="text-sm text-muted-foreground">
            {role === "receptionist" ? "Master Hospital Timeline" : "Your Personal Schedule"}
          </p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border shadow-lg">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CalendarCheck className="h-5 w-5 text-primary" /> Active Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No appointments found.</TableCell>
                  </TableRow>
                ) : (
                  visibleAppointments.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="pl-6 font-medium">{a.date.split('T')[0]}</TableCell>
                      <TableCell>{a.patientName}</TableCell>
                      <TableCell>{a.doctorName}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                          {a.specialization}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          a.status === "Completed" ? "bg-emerald-500/10 text-emerald-500" :
                          a.status === "Scheduled" ? "bg-primary/10 text-primary" :
                          "bg-destructive/10 text-destructive"
                        }`}>
                          {a.status}
                        </span>
                      </TableCell>
                      
                      {/* ROLE-BASED ACTIONS COLUMN */}
                      <TableCell className="text-right pr-6">
                        
                        {/* PATIENT VIEW: View Secure PIN & Cancel */}
                        {(role === "patient" && a.status === "Scheduled") && (
                          <div className="flex items-center justify-end gap-4">
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">
                                Secure Visit PIN
                              </span>
                              <span className="font-mono text-sm font-bold tracking-[0.25em] text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                {a.otp || "------"}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleCancelAppointment(a.id)}>
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                          </div>
                        )}

                        {/* DOCTOR VIEW: Secure OTP Handshake */}
                        {(role === "doctor" && a.status === "Scheduled") && (
                          <Dialog open={selectedApptId === a.id} onOpenChange={(isOpen) => {
                            setSelectedApptId(isOpen ? a.id : null);
                            setOtpInput("");
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10">
                                <ShieldCheck className="w-4 h-4 mr-2" /> Verify & Complete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Secure Visit Verification</DialogTitle>
                              </DialogHeader>
                              <div className="text-sm text-muted-foreground mb-4">
                                Ask patient <strong>{a.patientName}</strong> for their 6-digit visit OTP to permanently mark this appointment as completed.
                              </div>
                              <form onSubmit={(e) => handleCompleteWithOTP(e, a.id)} className="space-y-4">
                                <div className="space-y-2">
                                  <Label>6-Digit Patient OTP</Label>
                                  <Input 
                                    required 
                                    maxLength={6}
                                    placeholder="e.g. 123456" 
                                    className="text-center text-xl tracking-widest font-mono"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                                  />
                                </div>
                                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isProcessing || otpInput.length !== 6}>
                                  {isProcessing ? "Verifying..." : "Confirm Handshake"}
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* RECEPTIONIST VIEW: No actions needed, just viewing */}
                        {role === "receptionist" && (
                          <span className="text-xs text-muted-foreground">Read Only</span>
                        )}

                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}