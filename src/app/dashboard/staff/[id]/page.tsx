"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Briefcase, Phone, Calendar, Loader2, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ViewStaffProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            role,
            created_at,
            teacher_profiles (
              department,
              contact_number
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setStaff(data);
      } catch (error) {
        console.error('Error fetching staff profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchStaffProfile();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-muted" size={32} />
      </div>
    );
  }

  if (!staff) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '1rem' }}>Staff Member Not Found</h2>
        <button onClick={() => router.push('/dashboard/staff')} className="btn btn-primary">Return to Directory</button>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Staff Profile</h1>
            <p style={{ color: 'var(--text-muted)' }}>View details and access permissions.</p>
          </div>
        </div>
        <Link href={`/dashboard/staff/${id}/edit`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <Edit size={16} />
          Edit Profile
        </Link>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
          <div style={{ 
            width: '100px', height: '100px', borderRadius: '50%', 
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 700, flexShrink: 0
          }}>
            {staff.full_name?.substring(0, 2).toUpperCase() || 'ST'}
          </div>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
              {staff.full_name}
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                {staff.role}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Briefcase size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Department</div>
                  <div style={{ fontWeight: 500 }}>{staff.teacher_profiles?.department || 'Not Assigned'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Phone size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Contact Number</div>
                  <div style={{ fontWeight: 500 }}>{staff.teacher_profiles?.contact_number || 'N/A'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Joined Date</div>
                  <div style={{ fontWeight: 500 }}>{new Date(staff.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <User size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>System ID</div>
                  <div style={{ fontWeight: 500, fontSize: '0.75rem', wordBreak: 'break-all' }}>{staff.id}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
