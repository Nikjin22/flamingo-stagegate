import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Download, FileText, AlertTriangle, Clock, CheckCircle, BarChart2, Activity } from 'lucide-react'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('portfolio')

  const { data: launches } = useQuery({
    queryKey: ['launches'],
    queryFn: () => api.get('/launches').then(r => r.data)
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/launches/dashboard').then(r => r.data)
  })

  const tabs = [
    { key: 'portfolio',  label: 'Portfolio',        icon: FileText },
    { key: 'delayed',    label: 'Delayed launches',  icon: Clock },
    { key: 'overdue',    label: 'Overdue tasks',     icon: AlertTriangle },
    { key: 'approvals',  label: 'Approval status',   icon: CheckCircle },
    { key: 'duration',   label: 'Stage duration',    icon: BarChart2 },
    { key: 'readiness',  label: 'Readiness report',  icon: Activity },
  ]

  const delayedLaunches = launches?.filter(l =>
    l.targetLaunchDate && dayjs(l.targetLaunchDate).isBefore(dayjs()) && l.status !== 'Completed' && l.status !== 'Archived'
  ) || []

  const overdueTasks = launches?.flatMap(l =>
    (l.tasks || []).filter(t => t.dueDate && dayjs(t.dueDate).isBefore(dayjs()) && t.status !== 'Completed')
      .map(t => ({ ...t, launchName: l.productName }))
  ) || []

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return
    const headers = Object.keys(data[0])
    const rows = data.map(r => headers.map(h => r[h] || '').join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
  }

  const exportFullReport = () => {
    if (!launches) return
    const workbook = XLSX.utils.book_new()

    const portfolioData = launches.map(l => ({
      'Product Name': l.productName, 'Product Code': l.productCode, 'Category': l.category || '',
      'Business Unit': l.businessUnit || '', 'Region': l.region || '', 'Priority': l.priority, 'Status': l.status,
      'Target Date': l.targetLaunchDate ? dayjs(l.targetLaunchDate).format('DD/MM/YYYY') : '', 'Total Tasks': l._count?.tasks || 0
    }))
    const ws1 = XLSX.utils.json_to_sheet(portfolioData)
    ws1['!cols'] = Object.keys(portfolioData[0] || {}).map(() => ({ wch: 22 }))
    XLSX.utils.book_append_sheet(workbook, ws1, 'Portfolio')

    const delayedData = delayedLaunches.map(l => ({
      'Product Name': l.productName, 'Product Code': l.productCode,
      'Target Date': dayjs(l.targetLaunchDate).format('DD/MM/YYYY'),
      'Days Overdue': dayjs().diff(dayjs(l.targetLaunchDate), 'day'), 'Status': l.status, 'Priority': l.priority
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(delayedData.length > 0 ? delayedData : [{ 'Note': 'No delayed launches' }]), 'Delayed Launches')

    const overdueData = overdueTasks.map(t => ({
      'Task Name': t.name, 'Launch': t.launchName, 'Due Date': dayjs(t.dueDate).format('DD/MM/YYYY'),
      'Days Overdue': dayjs().diff(dayjs(t.dueDate), 'day'), 'Priority': t.priority, 'Status': t.status,
      'Assignee': t.assignee?.fullName || 'Unassigned'
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overdueData.length > 0 ? overdueData : [{ 'Note': 'No overdue tasks' }]), 'Overdue Tasks')

    const approvalData = launches.flatMap(l => (l.stages || []).map(s => ({
      'Product': l.productName, 'Stage': s.name, 'Stage Status': s.status, 'Completion %': s.completionPct,
      'Due Date': s.dueDate ? dayjs(s.dueDate).format('DD/MM/YYYY') : ''
    })))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(approvalData.length > 0 ? approvalData : [{ 'Note': 'No data' }]), 'Approval Status')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `Flamingo_Pharma_Report_${dayjs().format('DD-MM-YYYY')}.xlsx`)
  }

  const exportPDF = () => {
    if (!launches) return
    const doc = new jsPDF()
    doc.setFillColor(15, 40, 71)
    doc.rect(0, 0, 220, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Flamingo Pharma', 14, 12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Product Launch Portfolio Report', 14, 20)
    doc.setFontSize(9)
    doc.text(`Generated: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 27)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Portfolio Summary', 14, 42)

    const summaryData = [
      ['Total Launches', String(stats?.total || 0)], ['Active Launches', String(stats?.active || 0)],
      ['Completed Launches', String(stats?.completed || 0)], ['Delayed Launches', String(delayedLaunches.length)],
      ['Overdue Tasks', String(overdueTasks.length)], ['Pending Approvals', String(stats?.pendingApprovals || 0)],
    ]
    autoTable(doc, { startY: 46, head: [['Metric', 'Value']], body: summaryData, theme: 'grid', headStyles: { fillColor: [15, 40, 71], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [245, 247, 250] }, margin: { left: 14, right: 14 }, columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40 } } })

    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    const y1 = doc.lastAutoTable.finalY + 12
    doc.text('Launch Portfolio', 14, y1)
    autoTable(doc, {
      startY: y1 + 4, head: [['Product Name', 'Code', 'Business Unit', 'Priority', 'Status', 'Target Date']],
      body: launches.map(l => [l.productName, l.productCode, l.businessUnit || '—', l.priority, l.status, l.targetLaunchDate ? dayjs(l.targetLaunchDate).format('DD/MM/YYYY') : '—']),
      theme: 'grid', headStyles: { fillColor: [15, 40, 71], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [245, 247, 250] }, margin: { left: 14, right: 14 }, styles: { fontSize: 9 }
    })

    if (delayedLaunches.length > 0) {
      doc.addPage()
      doc.setFillColor(200, 54, 46); doc.rect(0, 0, 220, 16, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold')
      doc.text('Delayed Launches', 14, 11); doc.setTextColor(0, 0, 0)
      autoTable(doc, {
        startY: 22, head: [['Product Name', 'Code', 'Target Date', 'Days Overdue', 'Status']],
        body: delayedLaunches.map(l => [l.productName, l.productCode, dayjs(l.targetLaunchDate).format('DD/MM/YYYY'), String(dayjs().diff(dayjs(l.targetLaunchDate), 'day')) + ' days', l.status]),
        theme: 'grid', headStyles: { fillColor: [200, 54, 46], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [255, 245, 245] }, margin: { left: 14, right: 14 }, styles: { fontSize: 9 }
      })
    }

    if (overdueTasks.length > 0) {
      doc.addPage()
      doc.setFillColor(212, 130, 10); doc.rect(0, 0, 220, 16, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold')
      doc.text('Overdue Tasks', 14, 11); doc.setTextColor(0, 0, 0)
      autoTable(doc, {
        startY: 22, head: [['Task Name', 'Launch', 'Due Date', 'Days Overdue', 'Priority', 'Assignee']],
        body: overdueTasks.slice(0, 50).map(t => [t.name, t.launchName, dayjs(t.dueDate).format('DD/MM/YYYY'), String(dayjs().diff(dayjs(t.dueDate), 'day')) + ' days', t.priority, t.assignee?.fullName || 'Unassigned']),
        theme: 'grid', headStyles: { fillColor: [212, 130, 10], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [255, 248, 245] }, margin: { left: 14, right: 14 }, styles: { fontSize: 9 }
      })
    }

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150)
      doc.text(`Flamingo Pharmaceuticals Ltd — Confidential — Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' })
    }
    doc.save(`Flamingo_Pharma_Report_${dayjs().format('DD-MM-YYYY')}.pdf`)
  }

  const priorityBadge = (p) => p === 'High' ? 'badge-red' : p === 'Medium' ? 'badge-amber' : 'badge-teal'
  const statusBadge = (s) => s === 'Active' ? 'badge-teal' : s === 'Completed' ? 'badge-purple' : 'badge-gray'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reports & analytics</div>
          <div className="page-subtitle">Flamingo Pharma UK — Product launch portfolio analysis</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportFullReport} className="btn btn-success"><Download size={14} /> Export Excel</button>
          <button onClick={exportPDF} className="btn btn-danger"><Download size={14} /> Export PDF</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '18px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <div key={t.key} className={`tab-item ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <t.icon size={13} /> {t.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div className="stat-card"><div className="stat-value" style={{ color: '#1A6FD4' }}>{stats?.total || 0}</div><div className="stat-label">Total launches</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#0D9E7A' }}>{stats?.active || 0}</div><div className="stat-label">Active</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#D4820A' }}>{delayedLaunches.length}</div><div className="stat-label">Delayed</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#C8362E' }}>{overdueTasks.length}</div><div className="stat-label">Overdue tasks</div></div>
      </div>

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-title">Full launch portfolio</span>
            <button onClick={() => exportCSV(launches?.map(l => ({ Product: l.productName, Code: l.productCode, BusinessUnit: l.businessUnit, Priority: l.priority, Status: l.status, TargetDate: l.targetLaunchDate ? dayjs(l.targetLaunchDate).format('DD/MM/YYYY') : '' })), 'portfolio.csv')} className="btn btn-outline btn-xs"><Download size={12} /> CSV</button>
          </div>
          <table className="data-table">
            <thead><tr>{['Product', 'Code', 'Business unit', 'Priority', 'Status', 'Target date'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {launches?.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: '500', color: '#0F2847' }}>{l.productName}</td>
                  <td style={{ color: '#6B7280', fontFamily: 'monospace', fontSize: '12px' }}>{l.productCode}</td>
                  <td style={{ color: '#6B7280' }}>{l.businessUnit || '—'}</td>
                  <td><span className={`badge ${priorityBadge(l.priority)}`}>{l.priority}</span></td>
                  <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                  <td style={{ color: '#6B7280' }}>{l.targetLaunchDate ? dayjs(l.targetLaunchDate).format('DD/MM/YYYY') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delayed Tab */}
      {activeTab === 'delayed' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-title">Delayed launches</span>
            <button onClick={() => exportCSV(delayedLaunches.map(l => ({ Product: l.productName, Code: l.productCode, TargetDate: dayjs(l.targetLaunchDate).format('DD/MM/YYYY'), DaysOverdue: dayjs().diff(dayjs(l.targetLaunchDate), 'day') })), 'delayed.csv')} className="btn btn-outline btn-xs"><Download size={12} /> CSV</button>
          </div>
          {delayedLaunches.length === 0 ? (
            <div className="empty-state"><CheckCircle size={28} style={{ opacity: 0.3, marginBottom: '8px', color: '#0D9E7A' }} /><div>No delayed launches — everything on track</div></div>
          ) : (
            <table className="data-table">
              <thead><tr>{['Product', 'Code', 'Target date', 'Days overdue', 'Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {delayedLaunches.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: '500', color: '#0F2847' }}>{l.productName}</td>
                    <td style={{ color: '#6B7280', fontFamily: 'monospace', fontSize: '12px' }}>{l.productCode}</td>
                    <td style={{ color: '#6B7280' }}>{dayjs(l.targetLaunchDate).format('DD/MM/YYYY')}</td>
                    <td><span className="badge badge-red">{dayjs().diff(dayjs(l.targetLaunchDate), 'day')} days</span></td>
                    <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Overdue Tasks Tab */}
      {activeTab === 'overdue' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-title">Overdue tasks</span>
            <button onClick={() => exportCSV(overdueTasks.map(t => ({ Task: t.name, Launch: t.launchName, DueDate: dayjs(t.dueDate).format('DD/MM/YYYY'), DaysOverdue: dayjs().diff(dayjs(t.dueDate), 'day'), Assignee: t.assignee?.fullName || 'Unassigned' })), 'overdue_tasks.csv')} className="btn btn-outline btn-xs"><Download size={12} /> CSV</button>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="empty-state"><CheckCircle size={28} style={{ opacity: 0.3, marginBottom: '8px', color: '#0D9E7A' }} /><div>No overdue tasks</div></div>
          ) : (
            <table className="data-table">
              <thead><tr>{['Task', 'Launch', 'Due date', 'Days overdue', 'Priority', 'Assignee'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {overdueTasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: '500', color: '#0F2847' }}>{t.name}</td>
                    <td style={{ color: '#6B7280' }}>{t.launchName}</td>
                    <td style={{ color: '#6B7280' }}>{dayjs(t.dueDate).format('DD/MM/YYYY')}</td>
                    <td><span className="badge badge-red">{dayjs().diff(dayjs(t.dueDate), 'day')} days</span></td>
                    <td><span className={`badge ${priorityBadge(t.priority)}`}>{t.priority}</span></td>
                    <td style={{ color: '#6B7280' }}>{t.assignee?.fullName || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Approval Status Tab */}
      {activeTab === 'approvals' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}><span className="section-title">Approval status across all launches</span></div>
          {launches?.map(l => (
            <div key={l.id} style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: '500', color: '#0F2847', marginBottom: '8px', fontSize: '13px' }}>{l.productName}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {l.stages?.map(s => (
                  <span key={s.id} className={`badge ${s.status === 'Completed' ? 'badge-teal' : s.status === 'In Progress' ? 'badge-blue' : s.status === 'Under Review' ? 'badge-amber' : 'badge-gray'}`}>{s.name} · {s.completionPct}%</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stage Duration Tab */}
      {activeTab === 'duration' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="section-title">Stage duration analysis</span>
            <button onClick={() => exportCSV(launches?.flatMap(l => (l.stages || []).map(s => ({ Product: l.productName, Stage: s.name, Status: s.status, DueDate: s.dueDate ? dayjs(s.dueDate).format('DD/MM/YYYY') : '—', CompletionPct: s.completionPct, Tasks: s.tasks?.length || 0 }))), 'stage_duration.csv')} className="btn btn-outline btn-xs"><Download size={12} /> CSV</button>
          </div>
          {launches?.map(launch => (
            <div key={launch.id} style={{ marginBottom: '16px', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#F9FAFB', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500', fontSize: '13px', color: '#0F2847' }}>{launch.productName}</span>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{launch.stages?.filter(s => s.status === 'Completed').length || 0} / {launch.stages?.length || 0} stages completed</span>
              </div>
              <table className="data-table">
                <thead><tr>{['Stage', 'Status', 'Due date', 'Completion', 'Tasks done'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {launch.stages?.map(stage => {
                    const completedTasks = stage.tasks?.filter(t => t.status === 'Completed').length || 0
                    const totalTasks = stage.tasks?.length || 0
                    return (
                      <tr key={stage.id}>
                        <td style={{ fontWeight: '500', color: '#374151' }}>{stage.name}</td>
                        <td><span className={`badge ${stage.status === 'Completed' ? 'badge-teal' : stage.status === 'In Progress' ? 'badge-blue' : 'badge-gray'}`}>{stage.status}</span></td>
                        <td style={{ color: '#6B7280' }}>{stage.dueDate ? dayjs(stage.dueDate).format('DD/MM/YYYY') : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="prog" style={{ width: '60px' }}><div className="prog-fill" style={{ width: `${stage.completionPct}%`, background: stage.status === 'Completed' ? '#0D9E7A' : '#1A6FD4' }} /></div>
                            <span style={{ fontSize: '11px', color: '#6B7280' }}>{stage.completionPct}%</span>
                          </div>
                        </td>
                        <td style={{ color: '#6B7280' }}>{completedTasks}/{totalTasks}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Readiness Tab */}
      {activeTab === 'readiness' && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: '16px' }}>Readiness analysis across all launches</div>
          {launches?.map(launch => {
            const assessments = launch.assessments || []
            const categoryScores = {}
            assessments.forEach(a => { if (!categoryScores[a.category]) categoryScores[a.category] = a.score })
            const scores = Object.values(categoryScores)
            const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

            return (
              <div key={launch.id} style={{ marginBottom: '14px', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847' }}>{launch.productName}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{launch.productCode}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {avgScore !== null ? (
                      <><div style={{ fontSize: '20px', fontWeight: '500', color: avgScore >= 80 ? '#0D9E7A' : avgScore >= 60 ? '#D4820A' : '#C8362E' }}>{avgScore}%</div><div style={{ fontSize: '10px', color: '#9CA3AF' }}>Overall readiness</div></>
                    ) : (<div style={{ fontSize: '11px', color: '#D1D5DB' }}>Not assessed</div>)}
                  </div>
                </div>
                {scores.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {Object.entries(categoryScores).map(([cat, score]) => (
                      <div key={cat} style={{ textAlign: 'center', padding: '8px', background: '#F9FAFB', borderRadius: '8px' }}>
                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px' }}>{cat.substring(0, 5)}</div>
                        <div style={{ fontSize: '15px', fontWeight: '500', color: score >= 80 ? '#0D9E7A' : score >= 60 ? '#D4820A' : '#C8362E' }}>{score}%</div>
                      </div>
                    ))}
                  </div>
                ) : (<div className="empty-state" style={{ padding: '16px' }}>No readiness assessments yet</div>)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}