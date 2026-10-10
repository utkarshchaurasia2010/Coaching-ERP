"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Users, Edit2, Loader2, School, DoorOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function ClassesPage() {
  const { settings } = useSettings();
  const [batches, setBatches] = useState<any[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (settings?.academic_year) {
      loadData();
    }
  }, [settings?.academic_year]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch all class sections from unified batches table
      const { data: batchData, error: batchErr } = await supabase
        .from('batches')
        .select('*')
        .eq('academic_year', settings!.academic_year)
        .order('name');

      if (batchErr) throw batchErr;
      const currentBatches = batchData || [];
      setBatches(currentBatches);

      // Fetch student counts for each class section
      if (currentBatches.length > 0) {
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('batch_id');

        const counts: Record<string, number> = {};
        (enrollData || []).forEach(e => {
          counts[e.batch_id] = (counts[e.batch_id] || 0) + 1;
        });
        setEnrollmentCounts(counts);
      }

    } catch (err) {
      console.error("Error loading classes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group sections by Class / Grade Name
  const groupedClasses: Record<string, any[]> = {};
  batches.forEach(b => {
    const className = b.class_name || b.name.split('-')[0].trim() || b.name;
    if (!groupedClasses[className]) {
      groupedClasses[className] = [];
    }
    groupedClasses[className].push(b);
  });

  const filteredClassNames = Object.keys(groupedClasses).filter(className =>
    className.toLowerCase().includes(searchQuery.toLowerCase()) ||
    groupedClasses[className].some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>
            Classes & Sections
          </h1>
          <p className="text-muted">Manage academic grades, division sections, and classroom capacities.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/classes/new" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Create Class / Section
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="input-wrapper" style={{ maxWidth: '400px' }}>
        <div className="input-icon"><Search size={16} /></div>
        <input 
          type="text" 
          className="input" 
          placeholder="Search classes or sections..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 className="animate-spin text-muted" size={32} style={{ margin: '0 auto' }} />
        </div>
      ) : filteredClassNames.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <School size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
          <h3>No Classes Found</h3>
          <p style={{ marginTop: '0.5rem' }}>Create your first school class (e.g. Class 10, Class 6, Nursery).</p>
          <Link href="/dashboard/classes/new" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex', gap: '0.5rem', textDecoration: 'none' }}>
            <Plus size={18} /> Add New Class
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredClassNames.map(className => {
            const sections = groupedClasses[className];
            const totalEnrolled = sections.reduce((sum, s) => sum + (enrollmentCounts[s.id] || 0), 0);

            return (
              <div key={className} className="card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <School size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {className}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {sections.length} Section{sections.length > 1 ? 's' : ''} &bull; {totalEnrolled} Students
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section Cards */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Division Sections
                  </div>
                  {sections.map(sec => {
                    const enrolled = enrollmentCounts[sec.id] || 0;
                    const maxCap = sec.max_capacity || 40;

                    return (
                      <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <DoorOpen size={16} style={{ color: 'var(--primary)' }} />
                          <div>
                            <span style={{ fontWeight: 600 }}>{sec.name}</span>
                            {sec.room_no && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>({sec.room_no})</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <Users size={12} style={{ display: 'inline', marginRight: '3px' }} />
                            {enrolled} / {maxCap}
                          </span>
                          <Link href={`/dashboard/batches/${sec.id}/edit`} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none' }} title="Edit Section">
                            <Edit2 size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <Link href={`/dashboard/attendance?classId=${sections[0].id}`} style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                    Take Attendance &rarr;
                  </Link>
                  <Link href={`/dashboard/classes/new?className=${encodeURIComponent(className)}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    + Add Section
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
