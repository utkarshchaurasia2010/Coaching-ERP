"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, IndianRupee, FileText, Loader2, CheckCircle2, Download, ChevronDown, ChevronRight, Upload, MessageCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { downloadCSV } from "@/lib/export";
import { useSettings } from "@/context/SettingsContext";

export default function FinancialsPage() {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<"fees" | "transactions">("fees");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [fees, setFees] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  
  const [userRole, setUserRole] = useState<string>("admin");
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalPending: 0
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (userData?.role) setUserRole(userData.role);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (settings?.academic_year) {
      loadData();
    }
  }, [settings?.academic_year]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [feesResult, transResult] = await Promise.all([
        supabase
          .from('fees')
          .select(`
            *,
            students (full_name, enrollment_status),
            batches (name),
            transactions (amount_paid)
          `)
          .eq('academic_year', settings!.academic_year)
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select(`
            *,
            fees (
              title,
              students (id, full_name, enrollment_status, parent_contact, contact_number)
            )
          `)
          .eq('academic_year', settings!.academic_year)
          .order('payment_date', { ascending: false })
      ]);
      
      const feesData = feesResult.data || [];
      const transData = transResult.data || [];
      
      setFees(feesData);
      setTransactions(transData);
      
      let pending = 0;
      let collected = 0;
      
      feesData.forEach((f: any) => {
        if (f.status === 'paid') {
          collected += Number(f.total_amount);
        } else if (f.status === 'partial') {
          const paid = (f.transactions || []).reduce((sum: number, t: any) => sum + (Number(t.amount_paid) || 0), 0);
          collected += paid;
          pending += Math.max(0, Number(f.total_amount) - paid);
        } else {
          pending += Number(f.total_amount);
        }
      });
      
      setStats({ totalCollected: collected, totalPending: pending });
      
    } catch (err) {
      console.error("Error loading financials:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'fees') {
      const formattedData = fees.map(f => ({
        'Student Name': f.students?.full_name || '',
        'Fee Title': f.title,
        'Total Amount': f.total_amount,
        'Status': f.status
      }));
      downloadCSV(`fees_export_${new Date().toISOString().split('T')[0]}.csv`, formattedData);
    } else {
      const formattedData = transactions.map(t => ({
        'Receipt No': t.receipt_number,
        'Date': new Date(t.payment_date).toLocaleDateString(),
        'Student Name': t.fees?.students?.full_name || '',
        'Fee Title': t.fees?.title || '',
        'Amount Paid': t.amount_paid,
        'Payment Method': t.payment_method
      }));
      downloadCSV(`transactions_export_${new Date().toISOString().split('T')[0]}.csv`, formattedData);
    }
  };

  // Group fees by student
  const studentFeeGroups = fees.reduce((acc: any, fee: any) => {
    const studentId = fee.student_id;
    if (!acc[studentId]) {
      acc[studentId] = {
        studentName: fee.students?.full_name || 'Unknown',
        status: fee.students?.enrollment_status || 'unknown',
        fees: [],
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        currentMonthDue: 0
      };
    }

    let feePaid = 0;
    let feeDue = 0;
    if (fee.status === 'paid') {
      feePaid = Number(fee.total_amount);
      feeDue = 0;
    } else if (fee.status === 'partial') {
      feePaid = (fee.transactions || []).reduce((sum: number, t: any) => sum + (Number(t.amount_paid) || 0), 0);
      feeDue = Math.max(0, Number(fee.total_amount) - feePaid);
    } else {
      feePaid = 0;
      feeDue = Number(fee.total_amount);
    }

    const now = new Date();
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const isCurrentOrPast = !fee.due_date || new Date(fee.due_date + 'T23:59:59') <= endOfCurrentMonth;

    acc[studentId].fees.push({
      ...fee,
      calculatedPaid: feePaid,
      calculatedDue: feeDue
    });
    acc[studentId].totalAmount += Number(fee.total_amount);
    acc[studentId].totalPaid += feePaid;
    acc[studentId].totalDue += feeDue;
    if (isCurrentOrPast) {
      acc[studentId].currentMonthDue += feeDue;
    }
    return acc;
  }, {});

  const filteredStudentIds = Object.keys(studentFeeGroups).filter(id => {
    if (!searchQuery) return true;
    return studentFeeGroups[id].studentName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group transactions by student
  const studentTransactionGroups = transactions.reduce((acc: any, t: any) => {
    const student = t.fees?.students;
    if (!student) return acc;
    const studentId = student.id;
    if (!acc[studentId]) {
      acc[studentId] = {
        studentName: student.full_name || 'Unknown',
        status: student.enrollment_status || 'unknown',
        parentContact: student.parent_contact,
        studentContact: student.contact_number,
        payments: [],
        totalPaid: 0
      };
    }
    
    acc[studentId].payments.push({
      ...t,
      amount_paid: Number(t.amount_paid),
      fee_title: t.fees?.title || 'Unknown Fee'
    });
    
    acc[studentId].totalPaid += Number(t.amount_paid);
    return acc;
  }, {});

  const filteredStudentTransactionIds = Object.keys(studentTransactionGroups).filter(id => {
    if (!searchQuery) return true;
    return studentTransactionGroups[id].studentName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handlePrintAllReceipts = (studentId: string, e: any) => {
    e.stopPropagation();
    const studentGroup = studentTransactionGroups[studentId];
    if (!studentGroup) return;
    
    const payments = [...studentGroup.payments].sort((a: any, b: any) => 
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );

    const cur = currencySymbol;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;

    const combinedReceiptHtml = `
      <div class="receipt-card">
        <div class="header">
          <h2>${settings?.name || 'Institute'}</h2>
          <p>Comprehensive Payment Receipt</p>
        </div>
        <div class="row"><span class="label">Student</span><span class="value">${studentGroup.studentName}</span></div>
        <div class="row"><span class="label">Enrollment Status</span><span class="value" style="text-transform: capitalize;">${studentGroup.status}</span></div>
        
        <div style="margin-top: 1.5rem; border-top: 2px solid #eee; padding-top: 1rem;">
          <h3 style="font-size: 0.875rem; color: #666; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Payment Records</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
            <tr style="border-bottom: 1px solid #eee;">
              <th style="text-align: left; padding: 0.5rem 0; color: #666;">Date</th>
              <th style="text-align: left; padding: 0.5rem 0; color: #666;">Fee</th>
              <th style="text-align: right; padding: 0.5rem 0; color: #666;">Amount</th>
            </tr>
            ${payments.map((trans: any) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.75rem 0; color: #333;">
                  ${new Date(trans.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <div style="font-size: 0.6875rem; color: #999; margin-top: 0.25rem;">${trans.receipt_number || 'N/A'}</div>
                </td>
                <td style="padding: 0.75rem 0;">${trans.fee_title}</td>
                <td style="padding: 0.75rem 0; text-align: right; font-weight: 500;">${cur}${Number(trans.amount_paid).toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>
        </div>
        
        <div class="total" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px dashed #eee;">
          Total Paid: ${cur}${Number(studentGroup.totalPaid).toLocaleString()}
        </div>
      </div>
    `;

    w.document.write(`
      <html><head><title>${studentGroup.studentName} - Comprehensive Receipt</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 2rem; background: #f9fafa; margin: 0; }
        .receipt-card { background: white; padding: 2rem; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; page-break-inside: avoid; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .header h2 { margin: 0; font-size: 1.25rem; }
        .header p { margin: 0.25rem 0 0; color: #666; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #eee; }
        .row .label { color: #666; font-size: 0.875rem; flex-shrink: 0; margin-right: 1rem; }
        .row .value { font-weight: 600; font-size: 0.875rem; text-align: right; }
        .total { font-size: 1.25rem; font-weight: 700; text-align: center; margin: 1.5rem 0 0; color: #059669; }
        .print-btn-container { text-align: center; margin-bottom: 2rem; }
        .print-btn { background: #4f46e5; color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 1rem; }
        @media print { 
          body { background: white; padding: 0; }
          .receipt-card { box-shadow: none; max-width: 100%; border: none; padding: 0; }
          .no-print { display: none; } 
        }
      </style></head><body>
      <div class="print-btn-container no-print">
        <button class="print-btn" onclick="window.print()">Print Receipt</button>
      </div>
      ${combinedReceiptHtml}
      </body></html>
    `);
    w.document.close();
  };

  const handleWhatsAppSingleReceipt = (group: any, trans: any, e: any) => {
    e.stopPropagation();
    const contactToUse = group.parentContact || group.studentContact;
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

    const message = `Dear Parent,\n\nWe have received a payment of ₹${Number(trans.amount_paid).toLocaleString()} for ${group.studentName} towards ${trans.fee_title}. Receipt No: ${trans.receipt_number || 'N/A'}.\n\nThank you,\n${settings?.name || 'Institute Management'}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintSingleReceipt = (studentGroup: any, trans: any, e: any) => {
    e.stopPropagation();
    const cur = currencySymbol;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;

    w.document.write(`
      <html><head><title>Receipt - ${trans.receipt_number}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 2rem; background: #f9fafa; margin: 0; }
        .receipt-card { background: white; padding: 2rem; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .header h2 { margin: 0; font-size: 1.25rem; }
        .header p { margin: 0.25rem 0 0; color: #666; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #eee; }
        .row .label { color: #666; font-size: 0.875rem; flex-shrink: 0; margin-right: 1rem; }
        .row .value { font-weight: 600; font-size: 0.875rem; text-align: right; }
        .total { font-size: 1.5rem; font-weight: 700; text-align: center; margin: 1.5rem 0 0; color: #059669; }
        .print-btn-container { text-align: center; margin-bottom: 2rem; }
        .print-btn { background: #4f46e5; color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 1rem; }
        @media print { 
          body { background: white; }
          .receipt-card { box-shadow: none; max-width: 100%; border: 1px solid #eee; }
          .no-print { display: none; } 
        }
      </style></head><body>
      <div class="print-btn-container no-print">
        <button class="print-btn" onclick="window.print()">Print Receipt</button>
      </div>
      <div class="receipt-card">
        <div class="header">
          <h2>${settings?.name || 'Institute'}</h2>
          <p>Payment Receipt</p>
        </div>
        <div class="row"><span class="label">Receipt No.</span><span class="value">${trans.receipt_number || 'N/A'}</span></div>
        <div class="row"><span class="label">Student</span><span class="value">${studentGroup.studentName}</span></div>
        <div class="row"><span class="label">Fee</span><span class="value">${trans.fee_title}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${new Date(trans.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div class="row"><span class="label">Method</span><span class="value" style="text-transform:capitalize">${trans.payment_method || ''}</span></div>
        <div class="total">${cur}${Number(trans.amount_paid).toLocaleString()}</div>
      </div>
      </body></html>
    `);
    w.document.close();
  };

  const handlePrintFeeReceipt = (studentGroup: any, fee: any, e: any) => {
    e.stopPropagation();
    const cur = currencySymbol;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;

    const paid = (fee.transactions || []).reduce((sum: number, t: any) => sum + (Number(t.amount_paid) || 0), 0);

    w.document.write(`
      <html><head><title>Receipt - ${fee.title}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 2rem; background: #f9fafa; margin: 0; }
        .receipt-card { background: white; padding: 2rem; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .header h2 { margin: 0; font-size: 1.25rem; }
        .header p { margin: 0.25rem 0 0; color: #666; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #eee; }
        .row .label { color: #666; font-size: 0.875rem; flex-shrink: 0; margin-right: 1rem; }
        .row .value { font-weight: 600; font-size: 0.875rem; text-align: right; }
        .total { font-size: 1.5rem; font-weight: 700; text-align: center; margin: 1.5rem 0 0; color: #059669; }
        .print-btn-container { text-align: center; margin-bottom: 2rem; }
        .print-btn { background: #4f46e5; color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 1rem; }
        @media print { 
          body { background: white; }
          .receipt-card { box-shadow: none; max-width: 100%; border: 1px solid #eee; }
          .no-print { display: none; } 
        }
      </style></head><body>
      <div class="print-btn-container no-print">
        <button class="print-btn" onclick="window.print()">Print Receipt</button>
      </div>
      <div class="receipt-card">
        <div class="header">
          <h2>${settings?.name || 'Institute'}</h2>
          <p>Fee Receipt</p>
        </div>
        <div class="row"><span class="label">Student</span><span class="value">${studentGroup.studentName}</span></div>
        <div class="row"><span class="label">Fee Detail</span><span class="value">${fee.title}</span></div>
        <div class="row"><span class="label">Total Fee</span><span class="value">${cur}${Number(fee.total_amount).toLocaleString()}</span></div>
        <div class="row"><span class="label">Status</span><span class="value" style="text-transform:capitalize">${fee.status}</span></div>
        <div class="total">Paid: ${cur}${paid.toLocaleString()}</div>
        ${fee.transactions?.length > 0 ? `
          <div style="margin-top: 1rem; font-size: 0.75rem; color: #666; text-align: center;">
            Transactions: ${fee.transactions.map((t:any) => `${new Date(t.payment_date).toLocaleDateString()} (${t.payment_method})`).join(' | ')}
          </div>
        ` : ''}
      </div>
      </body></html>
    `);
    w.document.close();
  };

  const toggleExpand = (studentId: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const currencySymbol = settings?.currency === 'USD' ? '$' : '₹';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Financials</h1>
          <p className="text-muted">Manage fee collections, track pending dues, and generate receipts.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {userRole === 'admin' && (
            <button onClick={handleExportCSV} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={18} />
              Export CSV
            </button>
          )}
          {userRole === 'admin' && (
            <Link 
              href="/dashboard/financials/generate"
              className="btn btn-outline" 
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              <Plus size={18} />
              Generate Annual Fees
            </Link>
          )}
          <Link href="/dashboard/financials/defaulters" className="btn btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <AlertTriangle size={18} />
            Defaulters Hub
          </Link>
          {userRole === 'admin' && (
            <Link href="/dashboard/financials/new-fee" className="btn btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} />
              Assign New Fee
            </Link>
          )}
          <Link href="/dashboard/financials/collect" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IndianRupee size={18} />
            Collect Fees
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="card animate-in" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(5, 150, 105, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
            <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Total Collected</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{currencySymbol}{stats.totalCollected.toLocaleString()}</div>
          </div>
        </div>
        <div className="card animate-in delay-100" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
            <FileText size={24} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Total Pending</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{currencySymbol}{stats.totalPending.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-switcher">
        <button className={`tab-btn ${activeTab === 'fees' ? 'tab-active' : ''}`} onClick={() => setActiveTab('fees')}>
          <FileText size={18} /> Fees Overview
        </button>
        <button className={`tab-btn ${activeTab === 'transactions' ? 'tab-active' : ''}`} onClick={() => setActiveTab('transactions')}>
          <IndianRupee size={18} /> Transactions
        </button>
      </div>

      {/* Search */}
      <div className="input-wrapper" style={{ maxWidth: '400px' }}>
        <div className="input-icon"><Search size={16} /></div>
        <input 
          type="text" 
          className="input" 
          placeholder="Search students..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* FEES TAB - Grouped by Student */}
      {activeTab === 'fees' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Loader2 className="animate-spin text-muted" size={24} style={{ margin: '0 auto' }} />
            </div>
          ) : filteredStudentIds.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No fees assigned for this academic year.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredStudentIds.map(studentId => {
                const group = studentFeeGroups[studentId];
                const isExpanded = expandedStudents.has(studentId);
                const pendingCount = group.fees.filter((f: any) => f.status !== 'paid').length;
                const due = group.totalDue;
                const currentMonthDue = group.currentMonthDue;
                
                return (
                  <div key={studentId} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Student Row */}
                    <div 
                      onClick={() => toggleExpand(studentId)}
                      style={{ 
                        padding: '1rem 1.5rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        cursor: 'pointer',
                        background: isExpanded ? 'var(--surface)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        background: 'var(--primary)', color: 'white', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontWeight: 700, fontSize: '0.875rem', flexShrink: 0
                      }}>
                        {group.studentName.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{group.studentName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {group.fees.length} fee card{group.fees.length !== 1 ? 's' : ''}
                          {currentMonthDue > 0 ? (
                            <span style={{ color: 'var(--danger)', marginLeft: '0.5rem', fontWeight: 600 }}>
                              • Due Now: {currencySymbol}{currentMonthDue.toLocaleString()}
                            </span>
                          ) : due > 0 ? (
                            <span style={{ color: 'var(--warning)', marginLeft: '0.5rem' }}>
                              • Future Dues: {currencySymbol}{due.toLocaleString()}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>• All Dues Clear</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{currencySymbol}{group.totalAmount.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Paid</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--success)' }}>{currencySymbol}{group.totalPaid.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Due</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: due > 0 ? (currentMonthDue > 0 ? 'var(--danger)' : 'var(--warning)') : 'var(--success)' }}>
                          {currencySymbol}{due.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Fee Cards */}
                    {isExpanded && (
                      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>
                              <th style={{ padding: '0.75rem 1.5rem 0.75rem 4rem', textAlign: 'left' as const, fontWeight: 600 }}>Fee Title</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left' as const, fontWeight: 600 }}>Amount</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left' as const, fontWeight: 600 }}>Paid</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left' as const, fontWeight: 600 }}>Status</th>
                              {userRole === 'admin' && (
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' as const, fontWeight: 600 }}>Action</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {group.fees.map((fee: any) => {
                              const paid = fee.calculatedPaid ?? 0;
                              return (
                                <tr key={fee.id} style={{ borderTop: '1px solid var(--border)' }}>
                                  <td style={{ padding: '0.75rem 1.5rem 0.75rem 4rem', fontSize: '0.875rem', fontWeight: 500 }}>{fee.title}</td>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{currencySymbol}{Number(fee.total_amount).toLocaleString()}</td>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: paid > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{currencySymbol}{paid.toLocaleString()}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <span style={{ 
                                      background: fee.status === 'paid' ? 'rgba(5, 150, 105, 0.1)' : fee.status === 'partial' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                      color: fee.status === 'paid' ? 'var(--success)' : fee.status === 'partial' ? 'var(--warning)' : 'var(--danger)',
                                      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' as const
                                    }}>
                                      {fee.status}
                                    </span>
                                  </td>
                                  {userRole === 'admin' && (
                                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' as const }}>
                                      <Link href={`/dashboard/financials/fees/${fee.id}/edit`} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none' }}>Edit</Link>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TRANSACTIONS TAB - Grouped by Student */}
      {activeTab === 'transactions' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredStudentTransactionIds.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <IndianRupee size={36} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
              <p>No transactions found.</p>
            </div>
          ) : (
            <div>
              {filteredStudentTransactionIds.map((studentId) => {
                const group = studentTransactionGroups[studentId];
                const isExpanded = expandedStudents.has(studentId);
                const payments = [...group.payments].sort((a: any, b: any) => 
                  new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
                );

                return (
                  <div key={studentId} className="card" style={{ padding: 0, marginBottom: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {/* Student Accordion Header */}
                    <div 
                      onClick={() => toggleExpand(studentId)}
                      style={{ 
                        width: '100%', background: isExpanded ? 'var(--surface)' : 'transparent',
                        padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <button 
                            onClick={(e) => handlePrintAllReceipts(studentId, e)}
                            className="btn btn-outline" 
                            style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', alignSelf: 'flex-start', background: 'var(--background)' }}
                          >
                            <FileText size={14} /> Print All Receipts
                          </button>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '50%',
                              background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontWeight: 600, fontSize: '1.25rem', flexShrink: 0
                            }}>
                              {group.studentName.charAt(0)}
                            </div>
                            
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '1rem' }}>{group.studentName}</span>
                                <span style={{ 
                                  background: group.status === 'active' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: group.status === 'active' ? 'var(--success)' : 'var(--danger)',
                                  padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.6875rem',
                                  fontWeight: 600, textTransform: 'uppercase'
                                }}>
                                  {group.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                Total Paid: <span style={{ fontWeight: 600, color: 'var(--success)' }}>{currencySymbol}{group.totalPaid.toLocaleString()}</span>
                                {' · '}
                                {payments.length} receipt{payments.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: '2.5rem' }}>
                          {isExpanded ? <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content: Receipts List */}
                    {isExpanded && (
                      <div style={{ padding: '0 1.5rem 1.5rem', background: 'var(--surface)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                          {payments.map((trans: any) => (
                            <div key={trans.id} className="card animate-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>Receipt #{trans.receipt_number || 'N/A'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(trans.payment_date).toLocaleDateString()}</span>
                              </div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', flex: 1 }}>
                                {trans.fee_title}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                                <div>
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.125rem' }}>{trans.payment_method}</div>
                                  <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--success)' }}>{currencySymbol}{Number(trans.amount_paid).toLocaleString()}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button 
                                    onClick={(e) => handlePrintSingleReceipt(group, trans, e)}
                                    className="btn btn-outline" 
                                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--surface-solid)' }}
                                  >
                                    <FileText size={14} /> Print
                                  </button>
                                  <button 
                                    onClick={(e) => handleWhatsAppSingleReceipt(group, trans, e)}
                                    className="btn" 
                                    disabled={!(group.parentContact || group.studentContact)}
                                    title={!(group.parentContact || group.studentContact) ? "No contact number available" : "Share Receipt via WhatsApp"}
                                    style={{ 
                                      padding: '0.375rem 0.75rem', 
                                      fontSize: '0.75rem', 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '0.375rem', 
                                      background: '#25D366', 
                                      color: 'white'
                                    }}
                                  >
                                    <MessageCircle size={14} /> Share
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
