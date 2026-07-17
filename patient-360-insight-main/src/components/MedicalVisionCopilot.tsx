import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, Sparkles, Loader2, Database, AlertCircle, ClipboardPlus } from "lucide-react";

// 1. ADD THE PROP HERE
export default function MedicalVisionCopilot({ 
  activePatientId, 
  onAppendToNotes 
}: { 
  activePatientId?: string;
  onAppendToNotes?: (text: string) => void; 
}) {
  const [analysisType, setAnalysisType] = useState("full");
  const [analysis, setAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunDiagnostics = async () => {
    if (!activePatientId) return;
    setIsLoading(true);
    setError(null);
    setAnalysis("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/vlm/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: activePatientId, analysis_type: analysisType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `Server Error: ${response.status}`);
      if (data.status === "success") setAnalysis(data.analysis);
      else throw new Error("Diagnostic loop returned an invalid status.");
    } catch (err: any) {
      setError(err.message || "Failed to establish live sync link with GPU cluster.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-md bg-background">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="flex items-center gap-2 text-primary text-base">
          <Eye className="h-4 w-4" /> MedVault Autonomous Copilot
        </CardTitle>
        <CardDescription className="text-xs">
          Cross-references physical SSD files directly with historical MySQL timelines.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        
        <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-background text-sm">
          <Database className={`h-4 w-4 ${activePatientId ? "text-emerald-500" : "text-muted-foreground"}`} />
          <div className="flex-1 truncate">
            <span className="text-xs text-muted-foreground block font-medium">Staged Target Linkage</span>
            <span className="font-semibold text-xs tracking-wide">
              {activePatientId ? `Active File Identifier: ${activePatientId}` : "Staging Area Empty (Queue Idle)"}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">AI Intelligence Target</Label>
          <select 
            value={analysisType} 
            onChange={(e) => setAnalysisType(e.target.value)} 
            disabled={!activePatientId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm disabled:opacity-50"
          >
            <option value="full">Full Context Cross-Reference & Medication Guide</option>
            <option value="abnormalities">Isolate Out-of-Bounds & Critical Alerts Only</option>
            <option value="summary">High-Level 3-Sentence Physician Briefing</option>
          </select>
        </div>

        <Button onClick={handleRunDiagnostics} disabled={!activePatientId || isLoading} className="w-full text-xs font-semibold shadow-sm" size="sm">
          {isLoading ? <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Syncing SSD Files...</> : <><Sparkles className="h-3 w-3 mr-2" /> Compile Multi-Report Insights</>}
        </Button>

        {error && (
          <div className="flex items-start gap-1.5 p-3 border border-destructive/20 bg-destructive/5 text-destructive rounded-lg text-[11px] leading-relaxed">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div><span className="font-bold">Sync Fault:</span> {error}</div>
          </div>
        )}

        {analysis && (
          <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 text-foreground rounded-lg animate-fade-in space-y-3">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
              <Sparkles className="h-3 w-3" /> Unified Cross-Reference Evaluation:
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground bg-background/80 p-2.5 rounded border border-border/60 max-h-[240px] overflow-y-auto whitespace-pre-wrap">
              {analysis}
            </p>
            {/* 2. THE APPEND BUTTON */}
            {onAppendToNotes && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                onClick={() => onAppendToNotes(analysis)}
              >
                <ClipboardPlus className="h-3 w-3 mr-2" /> Push to Clinical Notes
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}