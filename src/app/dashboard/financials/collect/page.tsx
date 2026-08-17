"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Save, Loader2, IndianRupee, FileText, 
  Search, CheckCircle, CheckCircle2, Circle, QrCode, CreditCard, Banknote, Upload
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";
import { CustomSelect } from "@/components/ui/Select";

export default function CollectPaymentPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency === 'USD' ? '$' : '₹';
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [pendingFees, setPendingFees] = useState<any[]>([]);
  
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
  const [autoAllocateAmount, setAutoAllocateAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  // Custom UPI file upload (simulated)
  const [upiScreenshot, setUpiScreenshot] = useState<File | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [settings?.academic_year]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentFees(selectedStudentId);
    } else {
      setPendingFees([]);
      setSelectedFeeIds([]);
    }
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    try {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, enrollment_status')
        .eq('enrollment_status', 'active')
        .order('full_name');
      if (data) setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentFees = async (studentId: string) => {
    try {
      const { data } = await supabase
        .from('fees')
        .select(`
          id, title, total_amount, due_date, status,
          transactions(amount_paid)
        `)
        .eq('student_id', studentId)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('due_date', { ascending: true });

      if (data) {
        const feesWithBalance = data.map(fee => {
          const paid = (fee.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount_paid), 0);
          let balance = Number(fee.total_amount) - paid;
          if (balance <= 0 && (fee.status === 'pending' || fee.status === 'overdue')) {
             balance = Number(fee.total_amount); // allow re-collecting
          }
          return {
            ...fee,
            balance
          };
        }).filter(fee => fee.balance > 0);
        
        setPendingFees(feesWithBalance);
        setSelectedFeeIds([]);
        setAutoAllocateAmount("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFeeSelection = (id: string) => {
    setSelectedFeeIds(prev => 
      prev.includes(id) ? prev.filter(feeId => feeId !== id) : [...prev, id]
    );
    setAutoAllocateAmount(""); // clear auto allocate if manually toggling
  };

  const toggleAll = () => {
    if (selectedFeeIds.length === pendingFees.length) {
      setSelectedFeeIds([]);
    } else {
      setSelectedFeeIds(pendingFees.map(f => f.id));
    }
    setAutoAllocateAmount("");
  };

  // Smart Auto-Allocate (FIFO)
  const handleAutoAllocate = (amountStr: string) => {
    setAutoAllocateAmount(amountStr);
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
      setSelectedFeeIds([]);
      return;
    }

    let remaining = amount;
    const selected: string[] = [];
    
    // Iterate through fees sorted by due_date (FIFO)
    for (const fee of pendingFees) {
      if (remaining > 0) {
        selected.push(fee.id);
        remaining -= fee.balance;
      } else {
        break;
      }
    }
    
    setSelectedFeeIds(selected);
  };

  const selectedFees = pendingFees.filter(f => selectedFeeIds.includes(f.id));
  const totalPayable = selectedFees.reduce((sum, fee) => sum + fee.balance, 0);

  const handleSubmit = async () => {
    if (selectedFeeIds.length === 0) return alert("Please select at least one fee.");
    if (paymentMethod === 'upi' && !upiScreenshot) return alert("Please attach a screenshot for UPI payment.");
    
    setProcessing(true);

    try {
      const baseId = Date.now().toString(36).toUpperCase();
      const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      const commonReceiptNumber = `RCPT-${baseId}${rand()}`;
      
      let screenshotUrl = null;
      if (paymentMethod === 'upi' && upiScreenshot) {
        const fileExt = upiScreenshot.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, upiScreenshot, { cacheControl: '3600', upsert: false });
          
        if (uploadError) {
          console.error("Screenshot upload error:", uploadError);
          throw new Error("Failed to upload screenshot. Make sure 'receipts' bucket exists and has public insert policies.");
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
          
        screenshotUrl = publicUrlData.publicUrl;
      }
      
      const transactionsToInsert = selectedFees.map((fee) => ({
        fee_id: fee.id,
        amount_paid: fee.balance, // Full balance of selected
        payment_method: paymentMethod,
        receipt_number: commonReceiptNumber,
        academic_year: settings?.academic_year || '2025-26',
        screenshot_url: screenshotUrl
      }));

      // 1. Insert all transactions
      const { error: transError } = await supabase.from('transactions').insert(transactionsToInsert);
      if (transError) throw transError;

      // 2. Update all fee statuses to 'paid'
      const { error: feeError } = await supabase
        .from('fees')
        .update({ status: 'paid' })
        .in('id', selectedFeeIds);
      if (feeError) throw feeError;

      alert(`Payment of ₹${totalPayable} collected successfully for ${selectedFees.length} invoice(s)!`);
      window.location.href = '/dashboard/financials';
      
    } catch (error: any) {
      console.error(error);
      alert('Failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin text-muted" size={32} /></div>;
  }

  const selectedStudentDetails = students.find(s => s.id === selectedStudentId);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* HEADER & SEARCH */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Collect Fees</h1>
          <p style={{ color: 'var(--text-muted)' }}>Invoice-based fee collection system.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(to right, var(--surface-solid), var(--surface))' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Select Student
            </label>
            <CustomSelect
              icon={<Search size={16} />}
              placeholder="Search or select a student..."
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              options={[{ value: '', label: 'Search or select a student...' }, ...students.map(s => ({ value: s.id, label: s.full_name }))]}
            />
          </div>
          
          {selectedStudentDetails && (
            <div style={{ display: 'flex', gap: '1rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border)', alignItems: 'center' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', 
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '1.25rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' 
              }}>
                {selectedStudentDetails.full_name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.2 }}>
                  {selectedStudentDetails.full_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Student</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedStudentId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT PANEL: OUTSTANDING INVOICES */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Outstanding Invoices</h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Select the dues to collect now.</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={toggleAll}
                  className="btn btn-outline" 
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                >
                  {selectedFeeIds.length === pendingFees.length && pendingFees.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pendingFees.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--success)' }} />
                  <p>No outstanding dues for this student.</p>
                </div>
              ) : (
                pendingFees.map(fee => {
                  const isSelected = selectedFeeIds.includes(fee.id);
                  const isOverdue = fee.due_date && new Date(fee.due_date) < new Date();
                  
                  return (
                    <div 
                      key={fee.id}
                      onClick={() => toggleFeeSelection(fee.id)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: '0.75rem', cursor: 'pointer',
                        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {isSelected ? <CheckCircle size={20} /> : <Circle size={20} />}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{fee.title}</span>
                          <span style={{ 
                            fontSize: '0.625rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: '4px', textTransform: 'uppercase',
                            background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                            color: isOverdue ? 'var(--danger)' : 'var(--success)'
                          }}>
                            {isOverdue ? 'Overdue' : 'Upcoming'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Due Date: {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      
                      <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                        {currencySymbol}{fee.balance.toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: PAYMENT SUMMARY */}
          <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Payment Summary
            </h3>

            {/* Smart Auto-Allocate */}
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>SMART AUTO-ALLOCATE (FIFO)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Enter an amount to automatically select and pay the oldest outstanding dues first.</div>
              <div className="input-wrapper">
                <div className="input-icon"><IndianRupee size={16} /></div>
                <input 
                  type="number" 
                  className="input" 
                  placeholder="Enter amount (e.g. 5000)" 
                  value={autoAllocateAmount}
                  onChange={(e) => handleAutoAllocate(e.target.value)}
                />
              </div>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selected Items:</span>
                <span style={{ fontWeight: 600 }}>{selectedFeeIds.length} invoice(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)' }}>
                <span>Net Payable:</span>
                <span>{currencySymbol}{totalPayable.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Choose Payment Method
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  style={{ 
                    padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${paymentMethod === 'cash' ? 'var(--primary)' : 'var(--border)'}`,
                    background: paymentMethod === 'cash' ? 'var(--primary)' : 'transparent',
                    color: paymentMethod === 'cash' ? 'white' : 'var(--foreground)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <Banknote size={16} /> Cash Counter
                </button>
                <button 
                  onClick={() => setPaymentMethod('upi')}
                  style={{ 
                    padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${paymentMethod === 'upi' ? 'var(--primary)' : 'var(--border)'}`,
                    background: paymentMethod === 'upi' ? 'var(--primary)' : 'transparent',
                    color: paymentMethod === 'upi' ? 'white' : 'var(--foreground)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <QrCode size={16} /> UPI QR Scan
                </button>
              </div>
            </div>

            {/* UPI Screenshot Upload */}
            {paymentMethod === 'upi' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '0.5rem', border: '1px dashed rgba(99, 102, 241, 0.3)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <Upload size={14} /> Attach Payment Screenshot
                </div>
                <label 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '0.75rem', 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: upiScreenshot ? 'var(--foreground)' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUpiScreenshot(e.target.files[0]);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  {upiScreenshot ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      {upiScreenshot.name}
                    </span>
                  ) : "Click to select a file"}
                </label>
              </div>
            )}

            <button 
              onClick={handleSubmit}
              disabled={processing || selectedFeeIds.length === 0}
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
              Generate Receipt & Record ({currencySymbol}{totalPayable})
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
