"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [masterCode, setMasterCode] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const fetchStaff = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            role,
            teacher_profiles (
              department,
              contact_number
            )
          `)
          .in('role', ['teacher', 'admin'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setStaff(data || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleDeleteRequest = (id: string) => {
    setStaffToDelete(id);
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
      // 1. Delete from teacher_profiles (if exists)
      await supabase.from('teacher_profiles').delete().eq('id', staffToDelete);
      
      // 2. Delete from public.users
      const { error } = await supabase.from('users').delete().eq('id', staffToDelete);

      if (error) throw error;
      
      setStaff(staff.filter(s => s.id !== staffToDelete));
      setDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting staff:', error);
      setDeleteError("Failed to delete staff member from database.");
    }
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Staff Administration</h1>
          <p className="text-muted">Manage teachers, administrators, and their access.</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard/staff/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={18} />
            Add Staff
          </Link>
        </div>
      </div>

      <div className="card animate-in delay-100" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-filters" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search staff by name or department..." 
              className="input"
              style={{ width: '100%', paddingLeft: '3rem' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8125rem', background: 'rgba(248, 250, 252, 0.5)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center' }}>
                    <Loader2 className="animate-spin text-muted" size={24} style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No staff members found.
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>{member.full_name}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ background: 'var(--background)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', border: '1px solid var(--border)', textTransform: 'capitalize' }}>
                        {member.role}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {member.teacher_profiles?.department || 'N/A'}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {member.teacher_profiles?.contact_number || 'N/A'}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Link 
                          href={`/dashboard/staff/${member.id}`}
                          title="View Profile"
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
                          href={`/dashboard/staff/${member.id}/edit`}
                          title="Edit Staff"
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
                          onClick={() => handleDeleteRequest(member.id)}
                          title="Delete Staff"
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card animate-in" style={{ maxWidth: '400px', width: '90%', padding: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Data Safety Verification</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Deleting a staff member will instantly revoke their access. Please enter the Master Code to authorize this deletion.
              </p>
              
              <div className="input-group" style={{ width: '100%', textAlign: 'left' }}>
                <label>Master Code</label>
                <input 
                  type="password" 
                  className="input" 
                  style={{ paddingLeft: '1.25rem' }} 
                  placeholder="Enter code (default: 0000)"
                  value={masterCode}
                  onChange={(e) => setMasterCode(e.target.value)}
                />
                {deleteError && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{deleteError}</p>}
              </div>

              <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1 }} 
                  onClick={() => setDeleteModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, background: 'var(--danger)' }} 
                  onClick={executeDelete}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
