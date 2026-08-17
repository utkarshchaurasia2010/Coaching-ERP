"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function SingleStudentExamPrintPage() {
  const params = useParams();
  const examId = params.exam_id as string;
  const studentId = params.student_id as string;
  const { settings, loading: settingsLoading } = useSettings();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. Fetch Exam
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*, batches(name)')
          .eq('id', examId)
          .single();

        if (examError) throw examError;
        setExam(examData);

        // 2. Fetch Subjects for Exam
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('exam_subjects')
          .select('*, subjects(name)')
          .eq('exam_id', examId);
          
        if (subjectsError) throw subjectsError;

        // 3. Fetch Student
        const { data: studentItem, error: studentError } = await supabase
          .from('students')
          .select('id, full_name')
          .eq('id', studentId)
          .single();
          
        if (studentError) throw studentError;

        // 4. Fetch Results for this student for these subjects
        const subjectIds = (subjectsData || []).map(s => s.id);
        let studentResults: any[] = [];
        if (subjectIds.length > 0) {
           const { data: resultsData, error: resultsError } = await supabase
             .from('exam_results')
             .select('*')
             .eq('student_id', studentId)
             .in('exam_subject_id', subjectIds);
           
           if (resultsError) throw resultsError;
           studentResults = resultsData || [];
        }

        // Compile data for student
        let totalMarksObtained = 0;
        let totalMaxMarks = 0;

        const subjectsInfo = (subjectsData || []).map(sub => {
          const res = studentResults.find(r => r.exam_subject_id === sub.id);
          const max = sub.max_marks || 0;
          const obtained = res?.marks_obtained ? parseFloat(res.marks_obtained) : null;
          
          totalMaxMarks += max;
          if (obtained !== null && !isNaN(obtained)) {
            totalMarksObtained += obtained;
          }

          return {
             name: sub.subjects?.name || 'Unknown',
             max_marks: max,
             marks_obtained: res?.marks_obtained || '-',
             remarks: res?.remarks || ''
          };
        });

        const percentage = totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(2) : '0.00';

        setStudentData({
          ...studentItem,
          subjects: subjectsInfo,
          totalMarksObtained,
          totalMaxMarks,
          percentage
        });

      } catch (error) {
        console.error("Error fetching print data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [examId, studentId]);

  useEffect(() => {
    if (!loading && !settingsLoading && exam && studentData) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, settingsLoading, exam, studentData]);

  if (loading || settingsLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 className="animate-spin text-primary" size={48} style={{ marginBottom: '1rem' }} />
        <p>Generating marksheet...</p>
      </div>
    );
  }

  if (!exam || !studentData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h1>No Data Found</h1>
        <p>Could not load the marksheet.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', color: '#000' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        body { background: #f1f5f9; padding: 20px; }
        .marksheet { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        @media print {
           .marksheet { border: none; box-shadow: none; max-width: 100%; margin: 0; padding: 20px; }
        }
        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
        .institute-name { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; }
        .report-title { font-size: 18px; font-weight: 600; margin: 0; color: #475569; }
        
        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info-row { display: flex; margin-bottom: 5px; }
        .info-label { font-weight: 600; width: 120px; color: #475569; }
        .info-value { font-weight: 500; color: #0f172a; }

        .marks-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .marks-table th, .marks-table td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
        .marks-table th { background-color: #f8fafc; font-weight: 600; color: #334155; }
        .marks-table tr:nth-child(even) { background-color: #f8fafc; }
        .marks-table .total-row { font-weight: bold; background-color: #e2e8f0 !important; }
        .marks-table .center { text-align: center; }
        
        .footer { margin-top: 60px; display: flex; justify-content: space-between; }
        .signature-line { width: 200px; border-top: 1px solid #64748b; text-align: center; padding-top: 10px; font-weight: 500; color: #475569; }
      `}} />

      <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
          Print Document
        </button>
      </div>

      <div className="marksheet">
        <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 className="institute-name">{settings?.name || "Coaching Institute"}</h1>
            <p style={{ margin: '0', color: '#64748b' }}>{settings?.address || ""}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 className="report-title">OFFICIAL MARKSHEET</h2>
        </div>

        <div className="student-info">
          <div>
            <div className="info-row">
              <div className="info-label">Student Name:</div>
              <div className="info-value">{studentData.full_name}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Student ID:</div>
              <div className="info-value">{studentData.id.substring(0, 8).toUpperCase()}</div>
            </div>
          </div>
          <div>
            <div className="info-row">
              <div className="info-label">Exam Name:</div>
              <div className="info-value">{exam.name}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Batch:</div>
              <div className="info-value">{exam.batches?.name}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Date:</div>
              <div className="info-value">{exam.date ? new Date(exam.date).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>
        </div>

        <table className="marks-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th className="center">Max Marks</th>
              <th className="center">Marks Obtained</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {studentData.subjects.map((sub: any, i: number) => (
              <tr key={i}>
                <td>{sub.name}</td>
                <td className="center">{sub.max_marks}</td>
                <td className="center" style={{ fontWeight: 600 }}>{sub.marks_obtained}</td>
                <td>{sub.remarks}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>GRAND TOTAL</td>
              <td className="center">{studentData.totalMaxMarks}</td>
              <td className="center">{studentData.totalMarksObtained}</td>
              <td>Percentage: {studentData.percentage}%</td>
            </tr>
          </tbody>
        </table>

        <div className="footer">
          <div className="signature-line">Class Teacher Signature</div>
          <div className="signature-line">Parent / Guardian Signature</div>
        </div>
      </div>
    </div>
  );
}
