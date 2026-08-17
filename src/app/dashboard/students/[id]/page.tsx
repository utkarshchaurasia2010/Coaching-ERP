"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Edit3, User, Mail, Phone, MapPin, Calendar, Users, BookOpen, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            enrollments (
              batches (
                id,
                name
              )
            )
          `)
          .eq('id', studentId)
          .single();

        if (error) throw error;
        setStudent(data);
      } catch (error) {
        console.error('Error fetching student:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 className="animate-spin text-muted" size={32} />
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <h2>Student not found</h2>
        <Link href="/dashboard/students" style={{ color: 'var(--primary)' }}>Back to Students</Link>
      </div>
    );
  }

  const batchName = student.enrollments?.[0]?.batches?.name || 'Unassigned';

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/students" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>{student.full_name}</h1>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>ID: {student.id.substring(0, 8)}</p>
              <span style={{ 
                  padding: '0.15rem 0.65rem', 
                  borderRadius: '999px', 
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: student.enrollment_status === 'active' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: student.enrollment_status === 'active' ? 'var(--success)' : 'var(--danger)'
                }}>
                {student.enrollment_status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        
        <Link href={`/dashboard/students/${student.id}/edit`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <Edit3 size={16} /> Edit Profile
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Column: Photo & Basic Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card animate-in delay-100" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ 
              width: '120px', height: '120px', borderRadius: '50%', 
              background: 'var(--background)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '1rem'
            }}>
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={40} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{student.full_name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{batchName}</p>
          </div>

          <div className="card animate-in delay-200" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--primary)' }} /> Personal Info
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InfoRow icon={<Mail size={16} />} label="Email" value={student.email || 'N/A'} />
              <InfoRow icon={<Phone size={16} />} label="Phone" value={student.contact_number || 'N/A'} />
              <InfoRow icon={<Calendar size={16} />} label="Date of Birth" value={student.date_of_birth || 'N/A'} />
              <InfoRow icon={<User size={16} />} label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'N/A'} />
            </div>
          </div>
        </div>

        {/* Right Column: Other Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card animate-in delay-200" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--success)' }} /> Parents & Address
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InfoRow icon={<User size={16} />} label="Parent Name" value={student.parent_name || 'N/A'} />
              <InfoRow icon={<Phone size={16} />} label="Parent Contact" value={student.parent_contact || 'N/A'} />
              <InfoRow icon={<MapPin size={16} />} label="Address" value={student.address || 'N/A'} />
            </div>
          </div>

          <div className="card animate-in delay-300" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} style={{ color: '#ec4899' }} /> Academic History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InfoRow icon={<BookOpen size={16} />} label="Previous School" value={student.previous_school || 'N/A'} />
              <InfoRow icon={<GraduationCap size={16} />} label="Board" value={student.board || 'N/A'} />
              <InfoRow icon={<GraduationCap size={16} />} label="Previous Grades" value={student.previous_grades || 'N/A'} />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{ color: 'var(--text-muted)', marginTop: '0.125rem' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--foreground)' }}>{value}</p>
      </div>
    </div>
  );
}
