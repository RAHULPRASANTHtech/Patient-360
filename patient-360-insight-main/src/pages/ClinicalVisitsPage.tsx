import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Activity, ClipboardPlus, Stethoscope, Loader2, Clock, CheckCircle2, User, FileSignature, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MedicalVisionCopilot from "@/components/MedicalVisionCopilot";

export default function ClinicalVisitsPage() {
  const { role, userId } = useAuth();
  const { toast } = useToast();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [vitals, setVitals] = useState({ bp: "120/80", hr: "72", temp: "98.6" });
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  
  // NEW: Structured Prescriptions State
  const [prescriptions, setPrescriptions] = useState<{medication: string, dosage: string}[]>([]);

  useEffect(() => {
    fetchWaitingRoom();
  }, [userId]);

  const fetchWaitingRoom = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/appointments');
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      const myPatients = data.filter((a: any) => a.doctorId === userId && a.status === "Scheduled");
      setAppointments(myPatients);
    } catch (error) {
      toast({ title: "Database Error", description: "Could not load the waiting room.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/visits/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: selectedVisit.id,
          patient_id: selectedVisit.patientId,
          doctor_id: userId,
          blood_pressure: vitals.bp,
          heart_rate: parseInt(vitals.hr),
          temperature: parseFloat(vitals.temp),
          diagnosis: diagnosis,
          notes: notes,
          prescriptions: prescriptions // SENDING STRUCTURED DATA TO BACKEND
        })
      });

      if (!response.ok) throw new Error("Failed to save record");

      toast({ 
        title: "Record Encrypted & Saved", 
        description: "The clinical notes and prescriptions have been stored in MedVault.",
        className: "bg-emerald-600 text-white border-none"
      });

      // Clear the workspace
      setSelectedVisit(null);
      setVitals({ bp: "120/80", hr: "72", temp: "98.6" });
      setDiagnosis("");
      setNotes("");
      setPrescriptions([]);
      fetchWaitingRoom(); 

    } catch (error: any) {
      toast({ title: "Submission Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P';

  // HELPER: Append AI text to the doctor's notes safely
  const appendToNotes = (aiText: string) => {
    setNotes(prev => prev ? `${prev}\n\n[AI DIAGNOSTIC EXTRACT]\n${aiText}` : `[AI DIAGNOSTIC EXTRACT]\n${aiText}`);
    toast({ title: "AI Diagnostics Imported", description: "The VLM extraction has been appended to your notes." });
  };

  if (role !== "doctor" && role !== "nurse") {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center text-muted-foreground space-y-4">
        <Stethoscope className="h-12 w-12 text-destructive opacity-80" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" /> Clinical Workspace
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your triage queue and securely document patient encounters.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT PANEL */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="border-border shadow-sm h-fit overflow-hidden bg-muted/10">
            <CardHeader className="bg-background border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Waiting Room
                </CardTitle>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                  {appointments.length} Pending
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center">
                  <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500 opacity-50" />
                  No patients currently waiting.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <AnimatePresence>
                    {appointments.map((apt) => (
                      <motion.button 
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                        key={apt.id} 
                        onClick={() => setSelectedVisit(apt)}
                        className={`w-full text-left p-4 flex items-center gap-4 transition-all duration-200 ${
                          selectedVisit?.id === apt.id 
                            ? "bg-background border-l-4 border-l-primary shadow-sm" 
                            : "hover:bg-background/50 border-l-4 border-l-transparent"
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          selectedVisit?.id === apt.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                        }`}>
                          {getInitials(apt.patientName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${selectedVisit?.id === apt.id ? "text-foreground" : "text-foreground/80"}`}>
                            {apt.patientName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="font-mono">ID: {apt.patientId}</span>
                            <span>•</span>
                            <span>{apt.date.split('T')[0]}</span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* THE COPILOT LINKED TO APPEND FUNCTION */}
          <MedicalVisionCopilot 
            activePatientId={selectedVisit?.patientId} 
            onAppendToNotes={appendToNotes} 
          />

        </div>

        {/* RIGHT PANEL: Active Clinical Chart */}
        <div className="xl:col-span-8">
          {!selectedVisit ? (
            <Card className="border-dashed border-2 bg-muted/5 h-full min-h-[600px] flex flex-col items-center justify-center text-center p-8 shadow-none">
              <div className="p-5 bg-background rounded-full mb-4 text-muted-foreground border border-border shadow-sm">
                <ClipboardPlus className="h-10 w-10 text-primary/40" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Workspace Idle</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                Select a patient from the waiting room queue to open their active chart, review their details, and begin documenting the clinical visit.
              </p>
            </Card>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={selectedVisit.id}>
              <Card className="border-border shadow-md overflow-hidden">
                <div className="bg-primary/5 border-b border-primary/10 p-6 flex justify-between items-start">
                  <div className="flex gap-4 items-center">
                    <div className="h-14 w-14 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary shadow-sm">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        {selectedVisit.patientName}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="bg-background px-2 py-0.5 rounded border border-border font-mono text-xs">
                          Patient ID: {selectedVisit.patientId}
                        </span>
                        <span>Apt Ref: {selectedVisit.id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <form onSubmit={handleCompleteVisit} className="space-y-8">
                    
                    {/* VITALS SECTION */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-border pb-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Objective Vitals</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/50">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase">Blood Pressure</Label>
                          <Input required value={vitals.bp} onChange={e => setVitals({...vitals, bp: e.target.value})} placeholder="120/80" className="font-mono text-lg bg-background" />
                        </div>
                        <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/50">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase">Heart Rate (BPM)</Label>
                          <Input type="number" required value={vitals.hr} onChange={e => setVitals({...vitals, hr: e.target.value})} placeholder="72" className="font-mono text-lg bg-background" />
                        </div>
                        <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/50">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase">Temperature (°F)</Label>
                          <Input type="number" step="0.1" required value={vitals.temp} onChange={e => setVitals({...vitals, temp: e.target.value})} placeholder="98.6" className="font-mono text-lg bg-background" />
                        </div>
                      </div>
                    </div>

                    {/* ASSESSMENT & PLAN */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-border pb-2">
                        <FileSignature className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Assessment & Plan</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-foreground font-semibold">Primary Diagnosis</Label>
                          <Input required value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g., Acute Bronchitis, Essential Hypertension" className="text-base" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground font-semibold">Clinical Notes</Label>
                          <Textarea 
                            required 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            placeholder="Detail the patient's subjective symptoms, your assessment, and recommended treatments here..." 
                            className="min-h-[160px] resize-y text-base leading-relaxed p-4"
                          />
                        </div>

                        {/* STRUCTURED PRESCRIPTION BUILDER */}
                        <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border">
                          <div className="flex items-center justify-between border-b border-border pb-3">
                            <Label className="text-foreground font-semibold flex items-center gap-2">
                                Structured Prescriptions
                            </Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => setPrescriptions([...prescriptions, {medication: "", dosage: ""}])}>
                                <Plus className="h-4 w-4 mr-1" /> Add Medication
                            </Button>
                          </div>
                          
                          {prescriptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic py-2">No medications prescribed.</p>
                          ) : (
                            <div className="space-y-3 pt-2">
                                {prescriptions.map((px, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <Input placeholder="Medication Name (e.g., Metformin)" value={px.medication} onChange={(e) => {
                                                const newP = [...prescriptions];
                                                newP[idx].medication = e.target.value;
                                                setPrescriptions(newP);
                                            }} />
                                        </div>
                                        <div className="w-1/3">
                                            <Input placeholder="Dosage (e.g., 500mg BID)" value={px.dosage} onChange={(e) => {
                                                const newP = [...prescriptions];
                                                newP[idx].dosage = e.target.value;
                                                setPrescriptions(newP);
                                            }} />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                            setPrescriptions(prescriptions.filter((_, i) => i !== idx));
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Button type="submit" size="lg" className="w-full sm:w-auto sm:float-right bg-emerald-600 hover:bg-emerald-700 text-white shadow-md" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardPlus className="h-4 w-4 mr-2" />}
                        {isSubmitting ? "Encrypting to MedVault..." : "Sign & Lock Electronic Health Record"}
                      </Button>
                      <div className="clear-both" />
                    </div>

                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}