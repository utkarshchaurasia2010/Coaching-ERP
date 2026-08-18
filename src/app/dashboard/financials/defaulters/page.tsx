"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, IndianRupee, MessageCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function DefaultersPage() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    if (settings?.academic_year) {
      loadDefaulters();
    }
  }, [settings?.academic_year]);

  const loadDefaulters = async () => {
    try {
      setLoading(true);
      
      const { data: feesData, error } = await supabase
        .from('fees')
        .select(`
          *,
          students (id, full_name, parent_contact, parent_name, enrollment_status, contact_number),
          batches (name),
          transactions (amount_paid)
        `)
        .eq('academic_year', settings!.academic_year)
        .in('status', ['pending', 'overdue', 'partial']);

      if (error) throw error;

      // Calculate end of current running month
      const now = new Date();
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Group by student
      const studentGroups: Record<string, any> = {};
      let total = 0;

      (feesData || []).forEach((fee: any) => {
        if (!fee.students) return; // ignore orphaned fees
        
        // Filter out future/upcoming months fees
        if (fee.due_date) {
          const feeDueDate = new Date(fee.due_date + 'T23:59:59');
          if (feeDueDate > endOfCurrentMonth) {
            return; // skip upcoming months
          }
        }
        
        const studentId = fee.student_id;
        const paid = fee.status === 'partial' 
          ? (fee.transactions || []).reduce((sum: number, t: any) => sum + (Number(t.amount_paid) || 0), 0)
          : 0;
        const pendingAmount = fee.status === 'partial' 
          ? Math.max(0, Number(fee.total_amount) - paid) 
          : Number(fee.total_amount);
        
        if (pendingAmount <= 0) return;

        if (!studentGroups[studentId]) {
          studentGroups[studentId] = {
            studentId,
            studentName: fee.students.full_name,
            parentName: fee.students.parent_name || 'Parent',
            parentContact: fee.students.parent_contact,
            studentContact: fee.students.contact_number,
            batchName: fee.batches?.name || 'N/A',
            status: fee.students.enrollment_status,
            totalPending: 0,
            pendingFees: []
          };
        }

        studentGroups[studentId].totalPending += pendingAmount;
        studentGroups[studentId].pendingFees.push({
          title: fee.title,
          amount: pendingAmount,
          dueDate: fee.due_date
        });

        total += pendingAmount;
      });

      const defaultersList = Object.values(studentGroups).sort((a: any, b: any) => b.totalPending - a.totalPending);
      
      setDefaulters(defaultersList);
      setTotalPending(total);

    } catch (err) {
      console.error("Error loading defaulters:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppReminder = (defaulter: any) => {
    const contactToUse = defaulter.parentContact || defaulter.studentContact;
    
    if (!contactToUse) {
      alert("No contact number found for this student or parent.");
      return;
    }

    let phone = contactToUse.replace(/\s+/g, '');
    if (!phone.startsWith('+')) {
      phone = `91${phone}`;
    } else {
      phone = phone.substring(1); 
    }

    const message = `Dear ${defaulter.parentName},\n\nThis is a gentle reminder that a fee amount of ₹${defaulter.totalPending.toLocaleString()} is pending for ${defaulter.studentName}. Please clear the dues at your earliest convenience to avoid any disruption.\n\nThank you,\n${settings?.name || 'Institute Management'}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const filteredDefaulters = defaulters.filter(d => {
    if (!searchQuery) return true;
    return d.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (d.parentContact && d.parentContact.includes(searchQuery));
  });

  return (
    <div className="page-content animate-in">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Link href="/dashboard/financials" className="btn btn-outline" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={16} />
            </Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>Fee Defaulters</h1>
          </div>
          <p className="text-muted">Students with pending fee balances</p>
        </div>
        
        <div className="card-solid" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Pending</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
              <IndianRupee size={18} style={{ marginRight: '0.125rem' }} />
              {totalPending.toLocaleString()}
            </div>
          </div>
          <div style={{ padding: '0.5rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '50%' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div className="input-wrapper" style={{ width: '300px' }}>
            <Search className="input-icon" size={18} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search by student name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Loading defaulters...
          </div>
        ) : filteredDefaulters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <h3>No Defaulters Found</h3>
            <p>Either everyone has paid, or no matching records found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Batch</th>
                  <th>Parent Contact</th>
                  <th style={{ textAlign: 'right' }}>Pending Amount</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDefaulters.map((d: any) => (
                  <tr key={d.studentId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.studentName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {d.pendingFees.length} pending fee(s)
                      </div>
                    </td>
                    <td>{d.batchName}</td>
                    <td>
                      <div>{d.parentContact || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.parentName}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                      ₹{d.totalPending.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn"
                        style={{ 
                          background: '#25D366', 
                          color: 'white', 
                          padding: '0.5rem 1rem', 
                          fontSize: '0.8125rem' 
                        }}
                        onClick={() => sendWhatsAppReminder(d)}
                        disabled={!(d.parentContact || d.studentContact)}
                        title={!(d.parentContact || d.studentContact) ? "No phone number available" : "Send WhatsApp Reminder"}
                      >
                        <MessageCircle size={16} style={{ marginRight: '0.25rem' }} />
                        WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
