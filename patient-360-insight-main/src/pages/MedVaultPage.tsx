import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Lock, Archive, Search, ActivitySquare, Loader2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function MedVaultPage() {
  const { role, userName, userId } = useAuth();
  const { toast } = useToast();
  
  // Dynamic Data States
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Search & Modal States
  const [searchDate, setSearchDate] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [temp, setTemp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FETCH THE LIVE DATA FROM PYTHON
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [patRes, docRes, recRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/patients'),
          fetch('http://127.0.0.1:8000/api/doctors'),
          fetch('http://127.0.0.1:8000/api/records')
        ]);
        
        setPatients(await patRes.json());
        setDoctors(await docRes.json());
        setMedicalRecords(await recRes.json());
      } catch (error) {
        toast({ title: "API Error", description: "Could not load database records.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchLiveData();
  }, [toast]);

  // STRICT ZERO-TRUST FILTERING
  const records = medicalRecords
    .filter(r => {
      let roleAccess = false; // DEFAULT TO FALSE (HIPAA Compliance)
      
      if (role === "patient") {
        // Patients only see their own records
        const myPatient = patients.find(p => p.name === userName);
        roleAccess = r.patientId === myPatient?.id;
      } else if (role === "doctor" || role === "nurse") {
        // Clinical staff only see records they explicitly authored or are assigned to
        roleAccess = r.doctorId === userId;
      } else {
        // Receptionists and Lab Techs are blocked from viewing clinical notes
        roleAccess = false;
      }
      
      let dateMatch = true;
      if (searchDate) {
        dateMatch = r.date.startsWith(searchDate);
      }

      return roleAccess && dateMatch;
    })
    .map(r => ({
      ...r,
      patientName: patients.find(p => p.id === r.patientId)?.name || "Unknown Patient",
      doctorName: doctors.find(d => d.id === r.doctorId)?.name || "Unknown Doctor",
    }));

  const handleRecordVitals = async (e: React.FormEvent, recordId: string) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: recordId,
          blood_pressure: bp,
          heart_rate: parseInt(hr),
          temperature: parseFloat(temp),
          recorded_by: userName 
        })
      });

      if (!response.ok) throw new Error("Failed to save to database");

      toast({ title: "Real-Time Vitals Saved", description: "Successfully inserted into MySQL Vitals_Log." });
      setBp(""); setHr(""); setTemp(""); setSelectedRecordId(null);
      
    } catch (error) {
      toast({ title: "Database Error", description: "Could not save vitals.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Loading Enterprise Database...</div>;
  }

  // If a non-clinical staff member tries to access this page, show a security warning
  if (role === "receptionist" || role === "lab_technician") {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center text-muted-foreground space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive opacity-80" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm">Your current role tier does not grant access to the MedVault Clinical Archive.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">MedVault Timeline</h2>
          <p className="text-sm text-muted-foreground">Live historical records with real-time vital tracking.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input 
            type="date" 
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="w-40"
          />
          {searchDate && <Button variant="ghost" size="sm" onClick={() => setSearchDate("")}>Clear</Button>}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-lg bg-muted/10">
          <p className="text-muted-foreground font-medium">No authorized records found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {records.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="relative h-full flex flex-col">
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Live DB</span>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    {r.visitId} — {r.date.split('T')[0]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 flex-grow">
                  <p className="font-semibold text-foreground">{r.diagnosis}</p>
                  <p className="text-sm text-muted-foreground mb-4">{r.notes}</p>
                  <p className="text-xs text-muted-foreground mt-auto">
                    {r.patientName} · {r.doctorName}
                  </p>

                  {(role === "doctor" || role === "nurse") && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Dialog 
                        open={selectedRecordId === r.id} 
                        onOpenChange={(isOpen) => {
                          setSelectedRecordId(isOpen ? r.id : null);
                          if (isOpen) { setBp(""); setHr(""); setTemp(""); }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full text-primary hover:text-primary border-primary/20">
                            <ActivitySquare className="h-4 w-4 mr-2" /> Add Real-Time Vitals
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Record Vitals for {r.patientName}</DialogTitle></DialogHeader>
                          <form onSubmit={(e) => handleRecordVitals(e, r.id)} className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2"><Label>Blood Pressure</Label><Input required value={bp} onChange={(e) => setBp(e.target.value)} /></div>
                              <div className="space-y-2"><Label>Heart Rate</Label><Input type="number" required value={hr} onChange={(e) => setHr(e.target.value)} /></div>
                              <div className="space-y-2"><Label>Temp (°F)</Label><Input type="number" step="0.1" required value={temp} onChange={(e) => setTemp(e.target.value)} /></div>
                              <div className="space-y-2"><Label>Audit Trail</Label><Input value={`Logged by: ${userName}`} disabled className="bg-muted text-xs font-mono" /></div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save to Database"}</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}