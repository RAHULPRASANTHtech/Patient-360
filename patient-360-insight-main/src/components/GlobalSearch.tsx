import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { patients, getPatientRecords } from "@/data/mockData";
import { PatientTimeline } from "@/components/PatientTimeline";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GlobalSearch() {
  const {role} = useAuth();
  const [query, setQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  if(role === "patient") return null; // Hide global search for patients

  const filtered = query.length >= 2
    ? patients.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelect = (id: string) => {
    setSelectedPatientId(id);
    setQuery("");
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const records = selectedPatientId ? getPatientRecords(selectedPatientId) : [];

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search patients by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-background"
        />
        {filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-lg">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground">ID: {p.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedPatientId} onOpenChange={() => setSelectedPatientId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Longitudinal View — {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>
          <PatientTimeline records={records} />
        </DialogContent>
      </Dialog>
    </>
  );
}
