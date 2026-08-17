"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, BookOpen, Calendar, Users, GraduationCap, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ViewBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [batch, setBatch] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatchDetails();
  }, []);

  const fetchBatchDetails = async () => {
    try {
      const { id } = await params;
      
      // Fetch Batch info
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select(`
          *,
          batch_subjects (
            subjects (
              id,
              name
            )
          )
        `)
        .eq('id', id)
        .single();
        
      if (batchError) throw batchError;
      setBatch(batchData);

      // Fetch Enrolled Students
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          students (
            id,
            full_name,
            contact_number,
            gender,
            enrollment_status
          )
        `)
        .eq('batch_id', id);

      if (enrollError) throw enrollError;
      if (enrollments) {
        setStudents(enrollments.map(e => ({
          ...e.students
        })));
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 className="animate-spin text-muted" size={32} />
      </div>
    );
  }

  if (!batch) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Batch not found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div className="flex-between animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => router.back()}
            className="btn btn-outline" 
            style={{ padding: '0.5rem', borderRadius: '50%' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {batch.name}
              <span style={{ 
                fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '999px',
                background: batch.status === 'active' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                color: batch.status === 'active' ? 'var(--success)' : 'var(--primary)'
              }}>
                {batch.status.toUpperCase()}
              </span>
            </h1>
            {batch.description && <p className="text-muted" style={{ marginTop: '0.25rem' }}>{batch.description}</p>}
          </div>
        </div>
        <Link href={`/dashboard/batches/${batch.id}/edit`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Edit Batch
        </Link>
      </div>

      <div className="grid-layout">
        {/* Main Content (Students List) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card animate-in delay-100" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
                <Users size={20} />
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Enrolled Students ({students.length})</h2>
            </div>
            
            <div className="table-container" style={{ minHeight: '200px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Contact</th>
                    <th style={{ textAlign: 'right' }}>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No students enrolled in this batch yet.
                      </td>
                    </tr>
                  ) : (
                    students.map(student => (
                      <tr key={student.id}>
                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>{student.full_name}</td>
                        <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)' }}>{student.contact_number || 'N/A'}</td>
                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                          <Link href={`/dashboard/students/${student.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
                            View Profile &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>

        {/* Sidebar Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Timeline Card */}
          <div className="card animate-in delay-200">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--primary)" />
              Timeline
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Start Date</div>
                <div style={{ fontWeight: 500 }}>{batch.start_date ? new Date(batch.start_date).toLocaleDateString() : 'Not set'}</div>
              </div>
              <div style={{ height: '1px', background: 'var(--border)' }}></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>End Date</div>
                <div style={{ fontWeight: 500 }}>{batch.end_date ? new Date(batch.end_date).toLocaleDateString() : 'Not set'}</div>
              </div>
            </div>
          </div>

          {/* Subjects Card */}
          <div className="card animate-in delay-300">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="var(--primary)" />
              Assigned Subjects
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {batch.batch_subjects && batch.batch_subjects.length > 0 ? (
                batch.batch_subjects.map((bs: any) => (
                  <span key={bs.subjects.id} style={{ 
                    padding: '0.375rem 0.75rem', 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '999px', 
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: 'var(--foreground)'
                  }}>
                    {bs.subjects.name}
                  </span>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No subjects assigned</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
