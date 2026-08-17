"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, Upload, MoreVertical, Loader2, Trash2, ShieldAlert, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { downloadCSV } from "@/lib/export";
import { CustomSelect } from "@/components/ui/Select";
import { useSettings } from "@/context/SettingsContext";

export default function StudentsPage() {
  const { settings } = useSettings();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [masterCode, setMasterCode] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("");

  // useEffect moved to depend on settings?.academic_year

  const fetchBatches = async () => {
    if (!settings?.academic_year) return;
    const { data } = await supabase.from('batches').select('id, name').eq('academic_year', settings.academic_year);
    if (data) setBatches(data);
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          contact_number,
          enrollment_status,
          current_class,
          enrollments (
            batches (
              id,
              name
            )
          )
        `)
        .eq('academic_year', settings!.academic_year || '2025-26')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings?.academic_year) {
      setLoading(true);
      fetchStudents();
      fetchBatches();
    }
  }, [settings?.academic_year]);

  const filteredStudents = selectedBatchFilter
    ? students.filter(s => s.enrollments?.[0]?.batches?.id === selectedBatchFilter)
    : students;

  const handleStatusChange = async (studentId: string, newStatus: string) => {
    try {
      // Optimistic update
      setStudents(students.map(s => s.id === studentId ? { ...s, enrollment_status: newStatus } : s));
      
      const { error } = await supabase
        .from('students')
        .update({ enrollment_status: newStatus })
        .eq('id', studentId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      fetchStudents(); // Revert on error
    }
  };

  const handleDeleteRequest = (studentId: string) => {
    setStudentToDelete(studentId);
    setDeleteModalOpen(true);
    setMasterCode("");
    setDeleteError("");
  };

  const executeDelete = async () => {
    if (masterCode !== "0000") { // Default Master Code for MVP
      setDeleteError("Invalid Master Code. Deletion denied.");
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete);

      if (error) throw error;
      
      setStudents(students.filter(s => s.id !== studentToDelete));
      setDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting student:', error);
      setDeleteError("Failed to delete student from database.");
    }
  };

  const handleExportCSV = () => {
    const formattedData = students.map(s => {
      const activeEnrollments = s.enrollments?.filter((e: any) => e.status === 'active') || [];
      const batchNames = activeEnrollments.map((e: any) => e.batches?.name).join(', ');
      
      return {
        'Student ID': s.id,
        'Name': s.full_name,
        'Primary Contact': s.primary_contact,
        'Date of Birth': s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '',
        'School': s.school_name || '',
        'Grade/Class': s.grade || '',
        'Active Batches': batchNames || 'None'
      };
    });
    
    downloadCSV(`students_export_${new Date().toISOString().split('T')[0]}.csv`, formattedData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between animate-in" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Students</h1>
          <p className="text-muted">Manage student enrollments, profiles, and batches.</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} />
            Export CSV
          </button>
          <Link href="/dashboard/students/import" className="btn btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} />
            Import CSV
          </Link>
          <Link href="/dashboard/students/new" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Add Student
          </Link>
        </div>
      </div>

      <div className="card delay-100 animate-in" style={{ padding: '0', overflow: 'visible', position: 'relative' }}>
        <div className="table-filters" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', position: 'relative', zIndex: 30 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search students by name, ID, or batch..." 
              className="input"
              style={{ width: '100%', paddingLeft: '3rem' }}
            />
          </div>
          <div style={{ width: '100%', maxWidth: '200px' }}>
            <CustomSelect
              options={[{ value: '', label: 'All Batches' }, ...batches.map(b => ({ value: b.id, label: b.name }))]}
              value={selectedBatchFilter}
              onChange={setSelectedBatchFilter}
              placeholder="All Batches"
            />
          </div>
        </div>

        <div className="table-container" style={{ minHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8125rem', background: 'rgba(248, 250, 252, 0.5)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Class</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Student Name</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Batch</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center' }}>
                    <Loader2 className="animate-spin text-muted" size={24} style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const batchName = student.enrollments?.[0]?.batches?.name || 'Unassigned';
                  
                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {student.current_class || '-'}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>{student.full_name}</td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ background: 'var(--background)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', border: '1px solid var(--border)' }}>
                          {batchName}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{student.contact_number}</td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <CustomSelect
                          variant="badge"
                          options={[
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' }
                          ]}
                          value={student.enrollment_status}
                          onChange={(val) => handleStatusChange(student.id, val)}
                          badgeColorMap={{
                            active: { bg: 'rgba(5, 150, 105, 0.1)', text: 'var(--success)' },
                            inactive: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)' }
                          }}
                        />
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Link 
                            href={`/dashboard/students/${student.id}`}
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
                            href={`/dashboard/students/${student.id}/edit`}
                            title="Edit Student"
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
                            onClick={() => handleDeleteRequest(student.id)}
                            title="Delete Student"
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
                  );
                })
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
                Deleting a student is permanent. Please enter the Master Code to authorize this deletion.
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
