"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useSettings } from "@/context/SettingsContext";

export default function BatchesPage() {
  const { settings } = useSettings();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [masterCode, setMasterCode] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (settings?.academic_year) {
      setLoading(true);
      fetchBatches();
    }
  }, [settings?.academic_year]);

  const fetchBatches = async () => {
    if (!settings?.academic_year) return;
    try {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          enrollments (count)
        `)
        .eq('academic_year', settings.academic_year);

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = statusFilter
    ? batches.filter(b => b.status === statusFilter)
    : batches;

  const handleStatusChange = async (batchId: string, newStatus: string) => {
    try {
      setBatches(batches.map(b => b.id === batchId ? { ...b, status: newStatus } : b));
      const { error } = await supabase.from('batches').update({ status: newStatus }).eq('id', batchId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating batch status:', error);
      fetchBatches();
    }
  };

  const handleDeleteRequest = (batchId: string) => {
    setBatchToDelete(batchId);
    setDeleteModalOpen(true);
    setMasterCode("");
    setDeleteError("");
  };

  const executeDelete = async () => {
    if (masterCode !== "0000") {
      setDeleteError("Invalid Master Code. Deletion denied.");
      return;
    }
    try {
      const { error } = await supabase.from('batches').delete().eq('id', batchToDelete);
      if (error) throw error;
      setBatches(batches.filter(b => b.id !== batchToDelete));
      setDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting batch:', error);
      setDeleteError("Failed to delete batch. It might have active enrollments or subjects.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between animate-in" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Batches & Academics</h1>
          <p className="text-muted">Manage classes, timings, and batch assignments.</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard/batches/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={18} />
            Create Batch
          </Link>
        </div>
      </div>

      <div className="card delay-100 animate-in" style={{ padding: '0' }}>
        <div className="table-filters" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', position: 'relative', zIndex: 30 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search batches by name..." 
              className="input"
              style={{ width: '100%', paddingLeft: '3rem' }}
            />
          </div>
          <div style={{ width: '100%', maxWidth: '200px' }}>
            <CustomSelect
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Statuses"
            />
          </div>
        </div>

        <div className="table-container" style={{ minHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Batch Name</th>
                <th>Timeline</th>
                <th>Enrolled</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center' }}>
                    <Loader2 className="animate-spin text-muted" size={24} style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No batches found.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{batch.name}</div>
                      {batch.description && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{batch.description}</div>}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {batch.start_date ? new Date(batch.start_date).toLocaleDateString() : 'TBD'} - 
                      {batch.end_date ? new Date(batch.end_date).toLocaleDateString() : 'TBD'}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)',
                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600
                      }}>
                        {batch.enrollments?.[0]?.count || 0} Students
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <CustomSelect
                        variant="badge"
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'cancelled', label: 'Cancelled' }
                        ]}
                        value={batch.status}
                        onChange={(val) => handleStatusChange(batch.id, val)}
                        badgeColorMap={{
                          active: { bg: 'rgba(5, 150, 105, 0.1)', text: 'var(--success)' },
                          completed: { bg: 'rgba(99, 102, 241, 0.1)', text: 'var(--primary)' },
                          cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)' }
                        }}
                      />
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Link 
                          href={`/dashboard/batches/${batch.id}`}
                          title="View Batch"
                          style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)',
                            transition: 'all 0.2s', textDecoration: 'none'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </Link>
                        
                        <Link 
                          href={`/dashboard/batches/${batch.id}/edit`}
                          title="Edit Batch"
                          style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)',
                            transition: 'all 0.2s', textDecoration: 'none'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--warning)'; e.currentTarget.style.color = 'white'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; e.currentTarget.style.color = 'var(--warning)'; }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </Link>

                        <button 
                          onClick={() => handleDeleteRequest(batch.id)}
                          title="Delete Batch"
                          style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'var(--danger)'; }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card animate-in" style={{ maxWidth: '400px', width: '90%', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)', marginBottom: '1rem' }}>
              <ShieldAlert size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground)' }}>Confirm Deletion</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              You are about to delete this batch. This action cannot be undone. Please enter the master code to confirm.
            </p>
            
            {deleteError && (
              <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {deleteError}
              </div>
            )}

            <div className="input-group">
              <label>Master Code</label>
              <input 
                type="password" 
                className="input" 
                placeholder="Enter 4-digit code"
                style={{ paddingLeft: '1.25rem' }}
                value={masterCode}
                onChange={(e) => setMasterCode(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={executeDelete}>
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
