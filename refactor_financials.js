const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/financials/page.tsx', 'utf8');

// 1. Update query to fetch students(id)
content = content.replace(
  /students \(full_name\)/,
  "students (id, full_name, enrollment_status)"
);

// 2. Add handlePrintAllReceipts and replace transaction grouping logic
const transactionLogicRegex = /\/\/ Group transactions by receipt number for combined receipts[\s\S]*?(?=const toggleExpand)/;
const newTransactionLogic = `// Group transactions by student
  const studentTransactionGroups = transactions.reduce((acc: any, t: any) => {
    const student = t.fees?.students;
    if (!student) return acc;
    const studentId = student.id;
    if (!acc[studentId]) {
      acc[studentId] = {
        studentName: student.full_name || 'Unknown',
        status: student.enrollment_status || 'unknown',
        receipts: {},
        totalPaid: 0
      };
    }
    
    if (!acc[studentId].receipts[t.receipt_number]) {
      acc[studentId].receipts[t.receipt_number] = {
        ...t,
        amount_paid: Number(t.amount_paid),
        fees_titles: [t.fees?.title || 'Unknown Fee']
      };
    } else {
      acc[studentId].receipts[t.receipt_number].amount_paid += Number(t.amount_paid);
      acc[studentId].receipts[t.receipt_number].fees_titles.push(t.fees?.title || 'Unknown Fee');
    }
    acc[studentId].totalPaid += Number(t.amount_paid);
    return acc;
  }, {});

  const filteredStudentTransactionIds = Object.keys(studentTransactionGroups).filter(id => {
    if (!searchQuery) return true;
    return studentTransactionGroups[id].studentName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handlePrintAllReceipts = (studentId: string, e: any) => {
    e.stopPropagation();
    const studentGroup = studentTransactionGroups[studentId];
    if (!studentGroup) return;
    
    const receipts = Object.values(studentGroup.receipts).sort((a: any, b: any) => 
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );

    const cur = currencySymbol;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;

    const receiptHtmls = receipts.map((trans: any) => \`
      <div class="receipt-card">
        <div class="header">
          <h2>\${settings?.name || 'Institute'}</h2>
          <p>Payment Receipt</p>
        </div>
        <div class="row"><span class="label">Receipt No.</span><span class="value">\${trans.receipt_number || 'N/A'}</span></div>
        <div class="row"><span class="label">Student</span><span class="value">\${studentGroup.studentName}</span></div>
        <div class="row"><span class="label">Fee(s)</span><span class="value">\${(trans.fees_titles || []).join(', ')}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">\${new Date(trans.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div class="row"><span class="label">Method</span><span class="value" style="text-transform:capitalize">\${trans.payment_method || ''}</span></div>
        <div class="total">\${cur}\${Number(trans.amount_paid).toLocaleString()}</div>
      </div>
    \`).join('<hr class="divider"/>');

    w.document.write(\`
      <html><head><title>\${studentGroup.studentName} - All Receipts</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 2rem; background: #f9fafa; margin: 0; }
        .receipt-card { background: white; padding: 2rem; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; page-break-inside: avoid; }
        .divider { border: 0; height: 1px; background: transparent; margin: 2rem 0; page-break-after: always; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .header h2 { margin: 0; font-size: 1.25rem; }
        .header p { margin: 0.25rem 0 0; color: #666; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #eee; }
        .row .label { color: #666; font-size: 0.875rem; flex-shrink: 0; margin-right: 1rem; }
        .row .value { font-weight: 600; font-size: 0.875rem; text-align: right; }
        .total { font-size: 1.5rem; font-weight: 700; text-align: center; margin: 1.5rem 0 0; color: #059669; }
        .print-btn-container { text-align: center; margin-bottom: 2rem; }
        .print-btn { background: #4f46e5; color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 1rem; }
        @media print { 
          body { background: white; }
          .receipt-card { box-shadow: none; max-width: 100%; border: 1px solid #eee; }
          .no-print { display: none; } 
          .divider { margin: 0; border: none; }
        }
      </style></head><body>
      <div class="print-btn-container no-print">
        <button class="print-btn" onclick="window.print()">Print All Receipts</button>
      </div>
      \${receiptHtmls}
      </body></html>
    \`);
    w.document.close();
  };

  `;
content = content.replace(transactionLogicRegex, newTransactionLogic);

// 3. Move search bar outside activeTab==='fees' check so it works for transactions too
const searchRegex = /\{\/\* Search \*\/\}\s*\{activeTab === 'fees' && \(\s*<div className="input-wrapper" style={{ maxWidth: '400px' }}>\s*<div className="input-icon"><Search size=\{16\} \/><\/div>\s*<input\s*type="text"\s*className="input"\s*placeholder="Search students\.\.\."\s*value=\{searchQuery\}\s*onChange=\{e => setSearchQuery\(e\.target\.value\)\}\s*\/>\s*<\/div>\s*\)\}/;
const newSearch = `{/* Search */}
      <div className="input-wrapper" style={{ maxWidth: '400px' }}>
        <div className="input-icon"><Search size={16} /></div>
        <input 
          type="text" 
          className="input" 
          placeholder="Search students..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>`;
content = content.replace(searchRegex, newSearch);

// 4. Replace transactions tab UI
const transactionsUIRegex = /\{\/\* TRANSACTIONS TAB \*\/\}\s*\{activeTab === 'transactions' && \([\s\S]*?(?=    <\/div>\s*\);\s*\})/g;

const newTransactionsUI = `{/* TRANSACTIONS TAB - Grouped by Student */}
      {activeTab === 'transactions' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredStudentTransactionIds.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <IndianRupee size={36} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
              <p>No transactions found.</p>
            </div>
          ) : (
            <div>
              {filteredStudentTransactionIds.map((studentId) => {
                const group = studentTransactionGroups[studentId];
                const isExpanded = expandedStudents.has(studentId);
                const receipts = Object.values(group.receipts).sort((a: any, b: any) => 
                  new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
                );

                return (
                  <div key={studentId} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Student Accordion Header */}
                    <button 
                      onClick={() => toggleExpand(studentId)}
                      style={{ 
                        width: '100%', border: 'none', background: isExpanded ? 'var(--surface)' : 'transparent',
                        padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background 0.15s'
                      }}
                    >
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 600, fontSize: '1.25rem', flexShrink: 0
                      }}>
                        {group.studentName.charAt(0)}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '1rem' }}>{group.studentName}</span>
                          <span style={{ 
                            background: group.status === 'active' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: group.status === 'active' ? 'var(--success)' : 'var(--danger)',
                            padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.6875rem',
                            fontWeight: 600, textTransform: 'uppercase'
                          }}>
                            {group.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Total Paid: <span style={{ fontWeight: 600, color: 'var(--success)' }}>{currencySymbol}{group.totalPaid.toLocaleString()}</span>
                          {' · '}
                          {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button 
                          onClick={(e) => handlePrintAllReceipts(studentId, e)}
                          className="btn btn-outline" 
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          <FileText size={14} /> Print All Receipts
                        </button>
                        {isExpanded ? <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                    </button>

                    {/* Expanded Content: Receipts List */}
                    {isExpanded && (
                      <div style={{ padding: '0 1.5rem 1.5rem', background: 'var(--surface)' }}>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Receipt No</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Fee(s)</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Method</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {receipts.map((trans: any) => (
                                <tr key={trans.receipt_number} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '1rem', fontWeight: 500, fontFamily: 'monospace' }}>{trans.receipt_number || 'N/A'}</td>
                                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(trans.payment_date).toLocaleDateString()}</td>
                                  <td style={{ padding: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem' }}>{(trans.fees_titles || []).join(', ')}</div>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                    <span style={{ textTransform: 'capitalize', background: 'var(--background)', border: '1px solid var(--border)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                      {trans.payment_method}
                                    </span>
                                  </td>
                                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--success)' }}>
                                    {currencySymbol}{Number(trans.amount_paid).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
`;

content = content.replace(transactionsUIRegex, newTransactionsUI);

fs.writeFileSync('src/app/dashboard/financials/page.tsx', content);
console.log('Successfully refactored financials page!');
