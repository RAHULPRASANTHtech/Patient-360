import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, FileBadge, Building, Key, Server, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const { role } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"onboarding" | "system">("onboarding");
  const [isProcessing, setIsProcessing] = useState(false);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);  
  // New Staff State
  const [staffForm, setStaffForm] = useState({
    firstName: "",
    lastName: "",
    role: "doctor",
    specialization: "",
    licenseNumber: "",
    phone: "",
    personalEmail: ""
  });

const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!govIdFile) return toast({ title: "Verification Required", description: "You must upload a Government ID.", variant: "destructive" });
    if (staffForm.role === "doctor" && !signatureFile) return toast({ title: "Signature Required", description: "Doctors must upload an E-Signature.", variant: "destructive" });
    
    setIsProcessing(true);

    // Create a Multipart FormData object
    const formData = new FormData();
    formData.append("firstName", staffForm.firstName);
    formData.append("lastName", staffForm.lastName);
    formData.append("role", staffForm.role);
    formData.append("specialization", staffForm.specialization);
    formData.append("licenseNumber", staffForm.licenseNumber);
    formData.append("phone", staffForm.phone);
    formData.append("personalEmail", staffForm.personalEmail);
    formData.append("govIdFile", govIdFile);
    if (signatureFile) formData.append("signatureFile", signatureFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/register-staff', {
        method: 'POST',
        body: formData // Notice: We do NOT set 'Content-Type'. Fetch handles it automatically for FormData!
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to provision account");

      toast({
        title: "Staff Provisioned & Files Uploaded!",
        description: `Credentials generated for ${data.hospital_email}. Temp Password: ${data.temp_password}`,
        duration: 15000,
        className: "bg-emerald-600 text-white border-none"
      });

      // Clear the form
      setStaffForm({ firstName: "", lastName: "", role: "doctor", specialization: "", licenseNumber: "", phone: "", personalEmail: "" });
      setGovIdFile(null);
      setSignatureFile(null);

    } catch (error: any) {
      toast({ title: "System Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (role !== "admin") {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center text-muted-foreground space-y-4">
        <Shield className="h-12 w-12 text-destructive opacity-80" />
        <h2 className="text-xl font-bold text-foreground">Access Denied: Level 5 Clearance Required</h2>
        <p className="text-sm">This terminal is restricted to System Administrators and HR Directors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" /> Admin Command Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Manage system infrastructure, staff credentialing, and security protocols.</p>
      </div>

      <div className="flex gap-4 border-b border-border pb-px">
        <button 
          onClick={() => setActiveTab("onboarding")}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-all ${activeTab === "onboarding" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <div className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Staff Credentialing</div>
        </button>
        <button 
          onClick={() => setActiveTab("system")}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-all ${activeTab === "system" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> Security Logs</div>
        </button>
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        {activeTab === "onboarding" && (
          <Card className="border-border shadow-lg">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <CardTitle>Provision New Staff Account</CardTitle>
              <CardDescription>Verify legal credentials and generate secure hospital access.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleRegisterStaff} className="space-y-6">
                
                {/* 1. Identity Verification */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground border-b pb-2">
                    <UserPlus className="h-4 w-4" /> Identity & Contact
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>First Name</Label><Input required placeholder="Rahul" value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Last Name</Label><Input required placeholder="Jay" value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Personal Mobile Number</Label><Input required placeholder="+91 99999 99999" value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Personal Email (For Recovery)</Label><Input type="email" required placeholder="rahul@personal.com" value={staffForm.personalEmail} onChange={e => setStaffForm({...staffForm, personalEmail: e.target.value})} /></div>
                  </div>
                </div>

                {/* 2. Legal Medical Credentialing */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground border-b pb-2">
                    <FileBadge className="h-4 w-4" /> Legal Credentialing
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>System Role</Label>
                      <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
                        <option value="doctor">Attending Physician (Doctor)</option>
                        <option value="nurse">Registered Nurse</option>
                        <option value="lab_technician">Lab Technician</option>
                        <option value="receptionist">Front Desk / Reception</option>
                      </select>
                    </div>
                    
                    {staffForm.role === "doctor" && (
                      <>
                        <div className="space-y-2">
                          <Label>Department / Specialization</Label>
                          <Input required placeholder="e.g., Cardiology, Neurology" value={staffForm.specialization} onChange={e => setStaffForm({...staffForm, specialization: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Medical Council License No.</Label>
                          <Input required placeholder="e.g., NMC-84920" className="font-mono uppercase" value={staffForm.licenseNumber} onChange={e => setStaffForm({...staffForm, licenseNumber: e.target.value})} />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Asset Uploads (Mock UI) */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground border-b pb-2">
                    <Building className="h-4 w-4" /> Document Verification
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Upload Government ID (.pdf, .jpg)</Label>
                      <Input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={e => setGovIdFile(e.target.files?.[0] || null)} className="text-sm cursor-pointer" />
                    </div>
                    {staffForm.role === "doctor" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Upload E-Signature Scan (.png transparent)</Label>
                        <Input type="file" required accept=".png" onChange={e => setSignatureFile(e.target.files?.[0] || null)} className="text-sm cursor-pointer" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button type="submit" size="lg" className="w-full bg-slate-800 hover:bg-slate-900 text-white" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Key className="h-5 w-5 mr-2" />}
                    {isProcessing ? "Allocating Database Node..." : "Generate Hospital Credentials & Issue Access"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "system" && (
          <Card className="border-border shadow-md h-64 flex items-center justify-center bg-muted/10">
            <p className="text-muted-foreground font-mono text-sm">System Event Audit Logs will be piped here.</p>
          </Card>
        )}
      </motion.div>
    </div>
  );
}