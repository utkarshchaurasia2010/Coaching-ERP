"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Loader2, X, Calendar, BookOpen, Users, Trash2, Tag, BookText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useSettings } from "@/context/SettingsContext";

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    if (settings?.academic_year) {
      fetchData();
    }
  }, [settings?.academic_year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: examsRes, error: examsError } = await supabase
        .from('exams')
        .select('*, batches(name)')
        .eq('academic_year', settings?.academic_year)
        .order('date', { ascending: false });

      if (examsError) throw examsError;
      const examsData = examsRes || [];
      const examIds = examsData.map(e => e.id);
      
      let examSubjectsMap: any = {};
      if (examIds.length > 0) {
        const { data: esData } = await supabase.from('exam_subjects').select('exam_id, id').in('exam_id', examIds);
        if (esData) {
          esData.forEach(es => {
            if (!examSubjectsMap[es.exam_id]) examSubjectsMap[es.exam_id] = 0;
            examSubjectsMap[es.exam_id]++;
          });
        }
      }

      setExams(examsData.map(e => ({...e, subjectCount: examSubjectsMap[e.id] || 0})));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Removed inline creation handlers

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="flex-between animate-in" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--foreground)" }}>Exams Management</h1>
          <p className="text-muted">Manage exams, marks, and test schedules.</p>
        </div>
        <div className="page-header-actions" style={{ display: "flex", gap: "1rem" }}>
          <Link href="/dashboard/academics/exams/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
            <Plus size={18} />
            Create New Exam
          </Link>
        </div>
      </div>

      <div className="card delay-100 animate-in" style={{ padding: "0", overflow: "hidden", position: "relative" }}>
        <div className="table-container" style={{ minHeight: "300px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "800px" }}>
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Batch</th>
                <th>Subjects</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center" }}>
                    <Loader2 className="animate-spin text-muted" size={24} style={{ margin: "0 auto" }} />
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No exams found. Create one to get started.
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600, color: "var(--foreground)" }}>
                      {exam.name}
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                        <Users size={14} />
                        {exam.batches?.name || "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                        <BookOpen size={14} />
                        {exam.subjectCount || 0} Subjects
                      </div>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                        <Calendar size={14} />
                        {exam.date ? new Date(exam.date).toLocaleDateString() : "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <Link 
                          href={"/dashboard/academics/exams/" + exam.id}
                          className="btn btn-outline"
                          style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                        >
                          Manage Results
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
