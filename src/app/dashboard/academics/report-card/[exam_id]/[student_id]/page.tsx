"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { ArrowLeft, Printer, Award, School, Calendar, User, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function StudentReportCardPage({ params }: { params: Promise<{ exam_id: string; student_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { exam_id, student_id } = resolvedParams;
  const { settings } = useSettings();

  const [student, setStudent] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [examSubjects, setExamSubjects] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [exam_id, student_id]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Student Details
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', student_id)
        .single();
      setStudent(studentData);

      // 2. Fetch Exam Details
      const { data: examData } = await supabase
        .from('exams')
        .select('*, batches(name)')
        .eq('id', exam_id)
        .single();
      setExam(examData);

      // 3. Fetch Exam Subjects
      const { data: subjectData } = await supabase
        .from('exam_subjects')
        .select('*, subjects(name)')
        .eq('exam_id', exam_id);
      setExamSubjects(subjectData || []);

      // 4. Fetch Results
      if (subjectData && subjectData.length > 0) {
        const subIds = subjectData.map(s => s.id);
        const { data: resultsData } = await supabase
          .from('exam_results')
          .select('*')
          .eq('student_id', student_id)
          .in('exam_subject_id', subIds);
        setResults(resultsData || []);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrade = (pct: number) => {
    if (pct >= 91) return { grade: 'A1', remarks: 'Outstanding' };
    if (pct >= 81) return { grade: 'A2', remarks: 'Excellent' };
    if (pct >= 71) return { grade: 'B1', remarks: 'Very Good' };
    if (pct >= 61) return { grade: 'B2', remarks: 'Good' };
    if (pct >= 51) return { grade: 'C1', remarks: 'Satisfactory' };
    if (pct >= 41) return { grade: 'C2', remarks: 'Average' };
    if (pct >= 33) return { grade: 'D', remarks: 'Pass' };
    return { grade: 'E', remarks: 'Needs Improvement' };
  };

  const totalMax = examSubjects.reduce((acc, s) => acc + (s.max_marks || 100), 0);
  const totalObtained = results.reduce((acc, r) => acc + (parseFloat(r.marks_obtained) || 0), 0);
  const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "0.0";
  const overallGrade = calculateGrade(parseFloat(overallPercentage));

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Generating Report Card...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem' }}>
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print" style={{ maxWidth: '850px', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Printer size={16} /> Print Report Card (A4)
        </button>
      </div>

      {/* Printable Report Card Sheet */}
      <div className="report-card-sheet" style={{
        maxWidth: '850px', margin: '0 auto', background: 'white', padding: '2.5rem',
        borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: '#0f172a',
        fontFamily: "'Inter', sans-serif"
      }}>
        
        {/* School Header Banner */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #cbd5e1', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="School Crest" style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 0.5rem' }} />
          ) : (
            <School size={48} style={{ margin: '0 auto 0.5rem', color: '#4f46e5' }} />
          )}
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {settings?.name || "Saint Xavier's International School"}
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0' }}>
            Affiliated to Central Board of Secondary Education (CBSE)
          </p>
          <div style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 1rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 700, marginTop: '0.5rem' }}>
            ANNUAL PROGRESS REPORT CARD &bull; {exam?.academic_year || '2026-27'}
          </div>
        </div>

        {/* Student Profile Block */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>STUDENT NAME</span>
            <strong style={{ fontSize: '1rem' }}>{student?.full_name || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>ADMISSION NUMBER</span>
            <strong>{student?.admission_no || 'ADM-N/A'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>ROLL NUMBER</span>
            <strong>{student?.roll_no || '1'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>CLASS & SECTION</span>
            <strong>{exam?.batches?.name || student?.current_class || 'Class 10-A'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>EXAMINATION</span>
            <strong>{exam?.name || 'Term Exam'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>DATE OF BIRTH</span>
            <strong>{student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}</strong>
          </div>
        </div>

        {/* Academic Marks Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Subject</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Maximum Marks</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Marks Obtained</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Subject Grade</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Teacher Remarks</th>
            </tr>
          </thead>
          <tbody>
            {examSubjects.map((sub, idx) => {
              const res = results.find(r => r.exam_subject_id === sub.id);
              const marks = parseFloat(res?.marks_obtained) || 0;
              const subMax = sub.max_marks || 100;
              const subPct = (marks / subMax) * 100;
              const subGrade = calculateGrade(subPct);

              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{sub.subjects?.name || 'Subject'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{subMax}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, color: marks < 33 ? '#ef4444' : '#0f172a' }}>
                    {marks}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>
                    {subGrade.grade}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.8125rem' }}>
                    {res?.remarks || subGrade.remarks}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
              <td style={{ padding: '0.75rem' }}>Grand Total</td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>{totalMax}</td>
              <td style={{ padding: '0.75rem', textAlign: 'center', color: '#059669', fontSize: '1rem' }}>{totalObtained}</td>
              <td style={{ padding: '0.75rem', textAlign: 'center', color: '#4f46e5', fontSize: '1rem' }}>{overallGrade.grade}</td>
              <td style={{ padding: '0.75rem', color: '#059669' }}>Overall: {overallPercentage}%</td>
            </tr>
          </tfoot>
        </table>

        {/* Grading Legend & Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '3rem', fontSize: '0.75rem', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '6px' }}>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#0f172a' }}>Grading Scale (CBSE Standard):</strong>
            <span>A1 (91-100) &bull; A2 (81-90) &bull; B1 (71-80) &bull; B2 (61-70) &bull; C1 (51-60) &bull; D (33-40)</span>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#0f172a' }}>Overall Assessment:</strong>
            <span style={{ color: '#059669', fontWeight: 600 }}>{overallGrade.remarks} &bull; Promoted to Next Term</span>
          </div>
        </div>

        {/* Official Signatures Line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop: '4rem', paddingTop: '1rem' }}>
          <div style={{ width: '180px', borderTop: '1px solid #94a3b8', paddingTop: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
            Class Teacher Signature
          </div>
          <div style={{ width: '180px', borderTop: '1px solid #94a3b8', paddingTop: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
            Parent / Guardian
          </div>
          <div style={{ width: '180px', borderTop: '1px solid #94a3b8', paddingTop: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
            Principal / Headmaster
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          .report-card-sheet { box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
