import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, FileText, CalendarCheck, ArrowLeft, FlaskConical, Loader2, UserRound, Phone, Mail, IdCard } from "lucide-react";
import { PatientTimeline } from "@/components/PatientTimeline"; 
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function PatientsPage() {
  const { role, userId } = useAuth();
  const { toast } = useToast();

  // --- Core States ---
  const [viewState, setViewState] = useState<"directory" | "profile">(role === "patient" ? "profile" : "directory");
  const [activePatientId, setActivePatientId] = useState<string | null>(role === "patient" ? userId : null);
  
  // --- Data States ---
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Load: Fetch Directory (if staff) or Fetch Profile (if patient)
  useEffect(() => {
    if (role === "patient" && userId) {
      fetchPatientProfile(userId);
    } else {
      fetchPatientDirectory();
    }
  }, [role, userId]);

  // --- Lab Upload States ---
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [testName, setTestName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !activePatientId) return;
    
    setIsUploading(true);
    
    // File uploads require FormData, not standard JSON!
    const formData = new FormData();
    formData.append("patient_id", activePatientId);
    formData.append("test_name", testName);
    formData.append("uploader_id", userId);
    formData.append("file", uploadFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/labs/upload', {
        method: 'POST',
        body: formData, // No 'Content-Type' header needed for FormData!
      });

      if (!response.ok) throw new Error("Upload failed");
      
      toast({ title: "Upload Success", description: "The lab report is now available in the patient's EHR." });
      setUploadFile(null);
      setTestName("");
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      fetchPatientProfile(activePatientId); // Refresh profile to show the new file
    } catch (error) {
      toast({ title: "Upload Error", description: "Failed to securely transfer file.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  
const fetchPatientDirectory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/patients');
      if (!res.ok) throw new Error("Failed to fetch patients");
      const allPatients = await res.json();
      
      // If doctor/nurse, ONLY show patients they have appointments/records with
      if (role === "doctor" || role === "nurse") {
        const aptRes = await fetch('http://127.0.0.1:8000/api/appointments');
        const allApts = await aptRes.json();
        const myPatientIds = new Set(allApts.filter((a:any) => a.doctorId === userId).map((a:any) => a.patientId));
        setPatientsList(allPatients.filter((p:any) => myPatientIds.has(p.id)));
      } else {
        // Receptionist sees everyone
        setPatientsList(allPatients);
      }
    } catch (error) {
      toast({ title: "Database Error", description: "Could not load patient registry.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatientProfile = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/patients/${id}/full`);
      if (!res.ok) throw new Error("Failed to fetch full profile");
      setFullProfile(await res.json());
      setViewState("profile");
      setActivePatientId(id);
    } catch (error) {
      toast({ title: "Profile Error", description: "Could not load the unified patient profile.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDirectory = () => {
    setViewState("directory");
    setActivePatientId(null);
    setFullProfile(null);
  };

  // --- LOADING STATE ---
  if (isLoading && !fullProfile && patientsList.length === 0) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Accessing Enterprise Database...</div>;
  }

  // --- VIEW 1: STAFF DIRECTORY ---
  if (viewState === "directory") {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-foreground">Patient Registry</h2>
        <Card className="shadow-md border-border">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary" /> Master Database
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">ID</TableHead>
                  <TableHead>Legal Name</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patientsList.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell>{p.age} yrs · {p.gender}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{p.phone}</div>
                      <div className="text-xs">{p.email}</div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="outline" size="sm" className="text-primary border-primary/20 hover:bg-primary/10" onClick={() => fetchPatientProfile(p.id)}>
                        Open 360° Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VIEW 2: UNIFIED 360° PROFILE ---
  if (viewState === "profile" && fullProfile) {
    const { demographics, medical_history, upcoming_appointments } = fullProfile;

    // Map MySQL history data to match what your PatientTimeline component expects!
    const mappedTimelineRecords = medical_history.map((r: any) => ({
      id: r.Record_ID,
      date: r.Created_Date,
      diagnosis: r.Diagnosis,
      notes: r.Notes,
      doctorName: r.Doctor_Name || "Unknown Provider"
    }));

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-6xl mx-auto">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {role !== "patient" && (
              <Button variant="ghost" size="icon" onClick={handleBackToDirectory} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                <UserRound className="h-6 w-6 text-primary" /> {demographics.Name}
              </h2>
              <p className="text-sm text-muted-foreground">Unified Electronic Health Record (EHR)</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground border border-border">ID: {demographics.Patient_ID}</span>
          </div>
        </div>

        {/* Top Demographics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-muted/20 border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary"><UserRound className="h-4 w-4" /></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Demographics</p><p className="text-sm font-medium">{demographics.Age} yrs, {demographics.Gender}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary"><Phone className="h-4 w-4" /></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Emergency Contact</p><p className="text-sm font-medium">{demographics.Phone || "N/A"}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary"><Mail className="h-4 w-4" /></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Email Portal</p><p className="text-sm font-medium truncate max-w-[150px]">{demographics.Email}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary"><IdCard className="h-4 w-4" /></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Govt ID On File</p><p className="text-sm font-mono font-medium">{demographics.Government_ID || "Unverified"}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Clinical History Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-md h-full">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" /> Longitudinal Clinical History</CardTitle>
                <CardDescription>Historical diagnoses, visit notes, and recorded vitals.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <PatientTimeline records={mappedTimelineRecords} />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Appointments & Labs */}
          <div className="space-y-6">
            
            {/* Active Appointments Module */}
            <Card className="border-border shadow-md">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><CalendarCheck className="h-4 w-4 text-primary" /> Upcoming Visits</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {upcoming_appointments.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No upcoming appointments scheduled.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {upcoming_appointments.map((apt: any) => (
                      <div key={apt.Appointment_ID} className="p-4 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{apt.Appointment_Date.split('T')[0]}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">{apt.Status}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">with {apt.Doctor_Name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Secure Lab Results Module (Cloud Ready) */}
            <Card className="border-border shadow-md">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><FlaskConical className="h-4 w-4 text-primary" /> Verified Lab Reports</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                
                {/* List Existing Reports */}
                <div className="divide-y divide-border">
                  {fullProfile.lab_reports.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No lab reports on file.</div>
                  ) : (
                    fullProfile.lab_reports.map((lab: any) => (
                      <div key={lab.Report_ID} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground">{lab.Test_Name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{lab.Upload_Date.split('T')[0]} · ID: {lab.Report_ID}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10">
                          <a href={lab.File_URL} target="_blank" rel="noopener noreferrer">View File</a>
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Upload Section (Restricted to Doctors & Lab Techs) */}
                {(role === "doctor" || role === "lab_technician") && (
                  <div className="p-4 border-t border-border bg-muted/10">
                    <form onSubmit={handleFileUpload} className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Test Name (e.g., Complete Blood Count)</Label>
                        <Input required value={testName} onChange={e => setTestName(e.target.value)} placeholder="Enter test name" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Attach Document (.pdf, .jpg)</Label>
                        <Input type="file" required ref={fileInputRef} onChange={e => setUploadFile(e.target.files?.[0] || null)} className="h-8 text-sm cursor-pointer" />
                      </div>
                      <Button type="submit" size="sm" className="w-full" disabled={isUploading || !uploadFile}>
                        {isUploading ? "Uploading to Cloud..." : "Securely Upload Report"}
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}