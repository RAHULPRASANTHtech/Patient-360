import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Sparkles, CalendarPlus, IdCard, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ReceptionIntakePage() {
  const { userName, userId } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"scheduler" | "ai_intake">("scheduler");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Database Data
  const [dbPatients, setDbPatients] = useState<any[]>([]);
  const [dbDoctors, setDbDoctors] = useState<any[]>([]);

  // ---------------- SCHEDULER STATES ----------------
  const [patientType, setPatientType] = useState<"existing" | "new">("existing");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [assignedDoctor, setAssignedDoctor] = useState("");
  const [apptDate, setApptDate] = useState("");
  
  // New Patient Form
  const [newPatient, setNewPatient] = useState({ name: "", age: "", gender: "Male", phone: "", email: "", govId: "" });

  // ---------------- AI INTAKE STATES ----------------
  const [rawSymptoms, setRawSymptoms] = useState("");
  const [wardType, setWardType] = useState("OP");

  useEffect(() => {
    fetchDropdowns();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [patRes, docRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/patients'),
        fetch('http://127.0.0.1:8000/api/doctors')
      ]);
      setDbPatients(await patRes.json());
      setDbDoctors(await docRes.json());
    } catch (error) {
      toast({ title: "Database Error", description: "Failed to load dropdowns.", variant: "destructive" });
    }
  };

  // --- ACTION: BOOK APPOINTMENT ---
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      let finalPatientId = selectedPatientId;

      // 1. If it's a new patient, register them in MySQL first!
      if (patientType === "new") {
        const regRes = await fetch('http://127.0.0.1:8000/api/patients/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newPatient.name, age: parseInt(newPatient.age), gender: newPatient.gender,
            phone: newPatient.phone, email: newPatient.email, gov_id: newPatient.govId
          })
        });
        if (!regRes.ok) throw new Error("Failed to register patient");
        const regData = await regRes.json();
        finalPatientId = regData.patient_id;
        fetchDropdowns(); // Refresh the dropdown list
      }

      // 2. Book the appointment & Generate the OTP
      const bookRes = await fetch('http://127.0.0.1:8000/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: finalPatientId,
          doctor_id: assignedDoctor,
          appointment_date: apptDate,
          booked_by: userId
        })
      });

      if (!bookRes.ok) throw new Error("Booking failed");
      const bookData = await bookRes.json();

      // 3. SHOW THE OTP TO THE RECEPTIONIST!
      toast({
        title: "Appointment Booked & Secured!",
        description: `SUCCESS: Please give the patient this Secure Visit PIN: [ ${bookData.otp_generated} ]`,
        duration: 10000, // Keep it on screen longer
        className: "bg-emerald-600 text-white border-none"
      });

      // Clear Form
      setPatientType("existing"); setSelectedPatientId(""); setAssignedDoctor(""); setApptDate("");
      setNewPatient({ name: "", age: "", gender: "Male", phone: "", email: "", govId: "" });

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- ACTION: AI INTAKE ---
  const handleAIIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatientId, ward_type: wardType, doctor_id: assignedDoctor, raw_symptoms: rawSymptoms })
      });
      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      
      toast({ title: "AI Extraction Success", description: `Symptoms Found: ${data.ai_analysis.detected_symptoms.join(", ")}` });
      setRawSymptoms("");
    } catch (error) {
      toast({ title: "AI Error", description: "Could not process NLP.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Front Desk Command Center</h2>
        <p className="text-sm text-muted-foreground">Register patients, schedule visits, and process AI intakes.</p>
      </div>

      {/* COMMAND TABS */}
      <div className="flex gap-4 border-b border-border pb-px">
        <button 
          onClick={() => setActiveTab("scheduler")}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-all ${activeTab === "scheduler" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <div className="flex items-center gap-2"><CalendarPlus className="w-4 h-4" /> Book Appointment</div>
        </button>
        <button 
          onClick={() => setActiveTab("ai_intake")}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-all ${activeTab === "ai_intake" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Walk-in Intake</div>
        </button>
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        
        {/* ===================== TAB 1: SCHEDULER ===================== */}
        {activeTab === "scheduler" && (
          <Card className="border-border shadow-lg">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle>Schedule an Appointment</CardTitle>
              <CardDescription>Book a future slot and generate a secure Visit PIN for the patient.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleBookAppointment} className="space-y-6">
                
                {/* Patient Toggle */}
                <div className="flex bg-muted p-1 rounded-lg w-fit">
                  <button type="button" onClick={() => setPatientType("existing")} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${patientType === "existing" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>Existing Patient</button>
                  <button type="button" onClick={() => setPatientType("new")} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${patientType === "new" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>Register New Patient</button>
                </div>

                {/* Patient Selection OR Creation */}
                {patientType === "existing" ? (
                  <div className="space-y-2">
                    <Label>Select Patient File</Label>
                    <select required value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="" disabled>Search database...</option>
                      {dbPatients.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/10">
                    <div className="space-y-2"><Label>Full Legal Name</Label><Input required value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Government ID (Aadhaar/Passport)</Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input required className="pl-9" placeholder="Enter ID Number" value={newPatient.govId} onChange={e => setNewPatient({...newPatient, govId: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Email Address</Label><Input type="email" required value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Phone Number</Label><Input required value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Age</Label><Input type="number" required value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Gender</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value})}>
                          <option>Male</option><option>Female</option><option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Appointment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Assign Doctor</Label>
                    <select required value={assignedDoctor} onChange={(e) => setAssignedDoctor(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="" disabled>Select a Specialist...</option>
                      {dbDoctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Visit</Label>
                    <Input type="date" required value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-primary" size="lg" disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Confirm Booking & Generate OTP"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ===================== TAB 2: AI INTAKE ===================== */}
        {activeTab === "ai_intake" && (
          <Card className="border-primary/20 shadow-lg">
             <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="flex items-center gap-2 text-primary"><UserPlus className="h-5 w-5" /> Walk-in Patient AI Extraction</CardTitle>
              <CardDescription>Enter raw symptoms. The Local AI will structure them into MedVault.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAIIntake} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Select Patient</Label>
                    <select required value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="" disabled>Select Patient...</option>
                      {dbPatients.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign to Doctor</Label>
                    <select required value={assignedDoctor} onChange={(e) => setAssignedDoctor(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="" disabled>Select a Doctor...</option>
                      {dbDoctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Raw Patient Complaints</Label>
                  <Textarea required placeholder="Type exactly what the patient says here..." className="min-h-[120px] resize-none" value={rawSymptoms} onChange={(e) => setRawSymptoms(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                  {isProcessing ? "AI Analyzing Text..." : "Analyze via AI & Save to MedVault"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}