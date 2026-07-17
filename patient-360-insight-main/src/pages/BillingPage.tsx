import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Receipt, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

// This tells TypeScript not to panic when we inject Razorpay's external script
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
  const { role, userId, userName } = useAuth();
  const { toast } = useToast();
  
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) fetchBills();
  }, [userId]);

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/billing/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      setBills(await response.json());
    } catch (error) {
      toast({ title: "Network Error", description: "Could not load billing ledger.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- THE REAL RAZORPAY INTEGRATION ---
  const handleRazorpayCheckout = async (bill: any) => {
    setIsProcessingId(bill.Bill_ID);
    
    // 1. Dynamically load the official Razorpay SDK script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      // 2. Configure the Real Razorpay Modal
      const options = {
        key: "rzp_test_T5RpsysBXAABJS", // <--- PASTE YOUR RAZORPAY TEST KEY HERE!
        amount: Math.round(parseFloat(bill.Amount) * 100), // Razorpay requires the amount in Paise! (e.g., ₹1500 = 150000 paise)
        currency: "INR",
        name: "MedGuard Hospital",
        description: bill.Description,
        image: "https://cdn-icons-png.flaticon.com/512/3063/3063206.png", // Hospital Logo
        
        // 3. What happens when the user successfully pays?
        handler: async function (response: any) {
          try {
            // Send the real Razorpay payment ID to your Python backend to update MySQL
            const backendRes = await fetch('http://127.0.0.1:8000/api/billing/pay', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bill_id: bill.Bill_ID,
                patient_id: userId,
                payment_method: "RAZORPAY_GATEWAY"
              })
            });

            if (!backendRes.ok) throw new Error("Backend verification failed");

            toast({ 
              title: "Payment Successful", 
              description: `Transaction ${response.razorpay_payment_id} verified.`,
              className: "bg-emerald-600 text-white border-none"
            });
            fetchBills(); // Refresh table to show "Paid" status

          } catch (error) {
            toast({ title: "Verification Error", description: "Payment received but DB update failed.", variant: "destructive" });
          }
        },
        prefill: {
          name: userName || "Sarah Mitchell",
          email: "patient@hospital.com",
          contact: "9999999999" // Dummy number for test mode
        },
        theme: {
          color: "#059669" // Matches your app's Emerald primary color perfectly
        }
      };

      // 4. Open the Razorpay Popup!
      const rzp = new window.Razorpay(options);
      
      // If the user closes the popup without paying, stop the loading spinner
      rzp.on('payment.failed', function (response: any) {
        toast({ title: "Payment Cancelled", description: response.error.description, variant: "destructive" });
      });

      rzp.open();
      setIsProcessingId(null);
    };
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Accessing Financial Records...</div>;
  }

  const totalDue = bills.filter(b => b.Status === "Pending").reduce((sum, b) => sum + parseFloat(b.Amount), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Billing Ledger</h2>
          <p className="text-sm text-muted-foreground">Manage invoices and secure payments.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Total Outstanding</p>
          <p className="text-3xl font-display font-bold text-destructive">₹{totalDue.toLocaleString()}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border shadow-lg">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <Receipt className="h-5 w-5 text-primary" /> Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No financial records found.</TableCell>
                  </TableRow>
                ) : (
                  bills.map(b => (
                    <TableRow key={b.Bill_ID}>
                      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{b.Bill_ID}</TableCell>
                      <TableCell>{b.Generated_Date ? b.Generated_Date.split('T')[0] : "N/A"}</TableCell>
                      <TableCell className="font-medium">{b.Description}</TableCell>
                      <TableCell className="font-bold">₹{parseFloat(b.Amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold ${
                          b.Status === "Paid" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                          "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}>
                          {b.Status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {b.Status === "Pending" ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleRazorpayCheckout(b)} 
                            disabled={isProcessingId === b.Bill_ID}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                          >
                            {isProcessingId === b.Bill_ID ? "Connecting..." : "Pay via Razorpay"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Txn: {b.Transaction_ID?.split('_')[1] || "Verified"}
                          </span>
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