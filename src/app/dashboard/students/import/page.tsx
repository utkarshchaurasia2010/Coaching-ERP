"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function ImportStudentsPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setStatus("uploading");
    // Simulate upload
    setTimeout(() => {
      setStatus("success");
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/dashboard/students" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Import Students</h1>
          <p style={{ color: 'var(--text-muted)' }}>Upload a CSV file to bulk import student records.</p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {status === "idle" || status === "error" ? (
          <>
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{ 
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`, 
                borderRadius: 'var(--radius-lg)', 
                padding: '4rem 2rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                background: dragActive ? 'rgba(37, 99, 235, 0.05)' : 'var(--background)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <input 
                type="file" 
                accept=".csv"
                onChange={handleChange}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
              />
              <Upload size={48} style={{ color: dragActive ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                {file ? file.name : "Drag and drop your CSV here"}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {file ? `${(file.size / 1024).toFixed(2)} KB` : "or click to browse from your computer"}
              </p>
            </div>

            {status === "error" && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>Failed to process CSV file. Please check the format and try again.</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <Link href="/dashboard/students" className="btn btn-outline" style={{ textDecoration: 'none' }}>Cancel</Link>
              <button 
                className="btn btn-primary" 
                disabled={!file} 
                onClick={handleUpload}
                style={{ opacity: !file ? 0.5 : 1, cursor: !file ? 'not-allowed' : 'pointer' }}
              >
                Upload & Process
              </button>
            </div>
          </>
        ) : status === "uploading" ? (
          <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>Processing CSV...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Validating records and importing data.</p>
          </div>
        ) : (
          <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Import Successful!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>45 student records have been successfully imported and added to the database.</p>
            <Link href="/dashboard/students" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Back to Students
            </Link>
          </div>
        )}
      </div>
      
      {status === "idle" && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} /> CSV Format Guidelines
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Your CSV file must include the following headers in exactly this order:
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 500 }}>first_name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 500 }}>last_name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 500 }}>email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 500 }}>phone</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 500 }}>batch_id</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>John</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Doe</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>john@example.com</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>+1234567890</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>jee-2027</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
              Download Sample Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
