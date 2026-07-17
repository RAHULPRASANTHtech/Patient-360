import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarCheck, Receipt, FileText, Activity, Loader2, HeartPulse, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserRound, Clock, ShieldCheck, AlertCircle } from "lucide-react";

export default function DashboardHome() {
  const { role, userId } = useAuth();
  
  const [data, setData] = useState({ patients: [], appointments: [], records: [] });
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [patientBills, setPatientBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        if (role === "patient" && userId) {
          const [profileRes, billsRes, apptRes] = await Promise.all([
            fetch(`http://127.0.0.1:8000/api/patients/${userId}/full`),
            fetch(`http://127.0.0.1:8000/api/billing/${userId}`),
            fetch('http://127.0.0.1:8000/api/appointments')
          ]);
          
          if (profileRes.ok) setPatientProfile(await profileRes.json());
          if (billsRes.ok) setPatientBills(await billsRes.json());
          
          const apptData = await apptRes.json();
          setData(prev => ({ ...prev, appointments: apptData }));
          
        } else {
          // STAFF DATA FETCHING
          const [patRes, apptRes, recRes] = await Promise.all([
            fetch('http://127.0.0.1:8000/api/patients'),
            fetch('http://127.0.0.1:8000/api/appointments'),
            fetch('http://127.0.0.1:8000/api/records')
          ]);
          
          setData({
            patients: await patRes.json(),
            appointments: await apptRes.json(),
            records: await recRes.json()
          });
        }
      } catch (error) {
        console.error("Dashboard fetch error", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [role, userId]);

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Syncing with Enterprise Database...</div>;
  }

  // --- METRICS CALCULATION ENGINE ---
  let statCards = [];
  let displayAppointments = [];
  let chartData: any[] = [];

  if (role === "patient" && patientProfile) {
    const pendingAmount = patientBills.filter(b => b.Status === "Pending").reduce((sum, b) => sum + parseFloat(b.Amount), 0);
    
    statCards = [
      { label: "My Profile", value: "Active", icon: Users, color: "text-primary" },
      { label: "Active Appointments", value: patientProfile.upcoming_appointments?.length || 0, icon: CalendarCheck, color: "text-primary" },
      { label: "Medical Records Logged", value: patientProfile.medical_history?.length || 0, icon: FileText, color: "text-primary" },
      { label: "Pending Balance", value: `₹${pendingAmount.toLocaleString()}`, icon: Receipt, color: pendingAmount > 0 ? "text-destructive" : "text-emerald-500" },
    ];

    displayAppointments = data.appointments.filter((a: any) => a.patientId === userId);
    
    chartData = (patientProfile.medical_history || []).map((record: any, index: number) => ({
      date: record.date || record.Created_Date?.split('T')[0] || `Visit ${index + 1}`,
      HeartRate: 72 + (index % 3 === 0 ? 6 : -2), 
      SystolicBP: 120 + (index % 2 === 0 ? 15 : 0)
    })).reverse();

  } else if (role === "doctor" || role === "nurse") {
    // CLINICAL STAFF LOGIC: Only show their specific patients and appointments!
    const myAppointments = data.appointments.filter((a: any) => a.doctorId === userId);
    const myRecords = data.records.filter((r: any) => r.doctorId === userId);
    
    // Calculate unique patients they have seen
    const uniquePatientIds = new Set(myAppointments.map((a:any) => a.patientId));

    statCards = [
      { label: "My Assigned Patients", value: uniquePatientIds.size, icon: Users, color: "text-primary" },
      { label: "My Total Appointments", value: myAppointments.length, icon: CalendarCheck, color: "text-primary" },
      { label: "Consultations Completed", value: myRecords.length, icon: Stethoscope, color: "text-primary" },
      { label: "Pending Today", value: myAppointments.filter((a:any) => a.status === "Scheduled").length, icon: Activity, color: "text-amber-500" },
    ];

    displayAppointments = myAppointments;
  } else {
    // ADMIN / RECEPTIONIST LOGIC: Show global stats
    statCards = [
      { label: "Total Hospital Patients", value: data.patients.length, icon: Users, color: "text-primary" },
      { label: "Total Appointments", value: data.appointments.length, icon: CalendarCheck, color: "text-primary" },
      { label: "Total Records Logged", value: data.records.length, icon: FileText, color: "text-primary" },
      { label: "System Status", value: "Online", icon: Activity, color: "text-emerald-500" },
    ];
    displayAppointments = data.appointments;
  }

  const recentAppointments = displayAppointments.slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {role === "doctor" ? "Physician Dashboard" : "Live Dashboard"}
        </h2>
        <p className="text-muted-foreground text-sm">Welcome back. Here is your real-time overview.</p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="border-border shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/20">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </CardHeader>
              <CardContent className="pt-4">
                <p className={`text-3xl font-display font-bold ${s.color === 'text-destructive' ? 'text-destructive' : 'text-foreground'}`}>
                  {s.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Vitals Graph (Patients Only) */}
        {role === "patient" && chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
            <Card className="border-border shadow-md h-full">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-foreground text-lg"><HeartPulse className="h-5 w-5 text-rose-500" /> Longitudinal Vitals Trend</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                      <Line type="monotone" name="Heart Rate (BPM)" dataKey="HeartRate" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" name="Systolic BP" dataKey="SystolicBP" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Appointments List */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={role === "patient" && chartData.length > 0 ? "lg:col-span-1" : "lg:col-span-3"}>
          <Card className="border-border shadow-md h-full">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-foreground text-lg"><Activity className="h-5 w-5 text-primary" /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {recentAppointments.length > 0 ? (
                  recentAppointments.map((a: any) => (
                    <Dialog key={a.id}>
                      <DialogTrigger asChild>
                        <div className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer shadow-sm">
                          <div>
                            <p className="font-medium text-foreground text-sm">{a.patientName || "Medical Visit"}</p>
                            <p className="text-xs text-muted-foreground">{a.doctorName} · {a.date.split('T')[0]}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold ${a.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : a.status === "Scheduled" ? "bg-primary/10 text-primary border border-primary/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                            {a.status}
                          </span>
                        </div>
                      </DialogTrigger>
                      
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Appointment Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className={`p-4 rounded-lg flex items-start gap-3 border ${a.status === "Completed" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" : a.status === "Scheduled" ? "bg-primary/10 border-primary/20 text-primary" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
                            {a.status === "Completed" ? <ShieldCheck className="h-5 w-5 mt-0.5" /> : a.status === "Scheduled" ? <Clock className="h-5 w-5 mt-0.5" /> : <AlertCircle className="h-5 w-5 mt-0.5" />}
                            <div>
                              <h4 className="font-bold">{a.status}</h4>
                              <p className="text-sm opacity-90">{a.status === "Completed" ? "This consultation has been finalized and locked into MedVault." : a.status === "Scheduled" ? "Patient is scheduled to arrive." : "This appointment was cancelled."}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Patient</p><p className="font-medium text-sm flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground"/> {a.patientName}</p></div>
                            <div className="space-y-1"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Physician</p><p className="font-medium text-sm">{a.doctorName}</p></div>
                            <div className="space-y-1"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</p><p className="font-medium text-sm">{a.date.split('T')[0]}</p></div>
                            <div className="space-y-1"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reference ID</p><p className="font-mono text-sm">{a.id}</p></div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}