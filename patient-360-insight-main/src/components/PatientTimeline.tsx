import { motion } from "framer-motion";
import { FileText, Stethoscope } from "lucide-react";
import { ShieldCheck } from "lucide-react";
interface TimelineRecord {
  id: string;
  date: string;
  diagnosis: string;
  notes: string;
  doctorName: string;
}

export function PatientTimeline({ records }: { records: TimelineRecord[] }) {
  if (records.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No medical records found.</p>;
  }

  return (
    <div className="relative pl-8 space-y-6 py-4">
      {/* The continuous vertical timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-primary/20" />
      
      {records.map((r, i) => (
        <motion.div
          key={`${r.id}-${i}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative"
        >
          {/* The timeline dot */}
          <div className="absolute -left-[1.35rem] top-4 h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm" />
          
          {/* The Data Card */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            
            {/* Top Header Row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {new Date(r.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md border border-border/50">
                <Stethoscope className="h-3 w-3" />
                {r.doctorName}
              </span>
            </div>
            
            {/* Core Medical Data */}
            <h4 className="font-semibold text-foreground flex items-center gap-2 mt-1">
              <FileText className="h-4 w-4 text-primary" />
              {r.diagnosis}
            </h4>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {r.notes}
            </p>

            {/* SECURE AUDIT STAMP */}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                LOCKED IN MEDVAULT • {new Date(r.date).toLocaleString('en-IN', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            
          </div>
        </motion.div>
      ))}
    </div>
  );
}
