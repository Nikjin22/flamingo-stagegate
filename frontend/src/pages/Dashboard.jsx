import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import { Clock, AlertTriangle, ShieldAlert, CheckCheck, Rocket, CalendarClock, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'

const riskBadge = (level) => level === 'High' ? 'badge-red' : level === 'Medium' ? 'badge-amber' : 'badge-teal'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['my-dashboard'],
    queryFn: () => api.get('/launches/dashboard/me').then(r => r.data),
    refetchInterval: 10000
  })

  const exportSnapshot = () => {
    if (!data?.allLaunchesSummary) return
    const rows = data.allLaunchesSummary.map(l => ({
      'Product': l.productName,
      'Code': l.productCode,
      'Status': l.status,
      'Current Stage': l.currentStage,
      'Progress %': l.progress,
      'Risk Level': l.riskLevel,
      'Risk Reasons': l.riskReasons?.join('; ') || ''
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 24 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio Snapshot')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Flamingo_Pharma_Snapshot_${dayjs().format('DD-MM-YYYY')}.xlsx`)
  }

  if (isLoading) return <div className="empty-state" style={{ padding: '80px' }}>Loading dashboard...</div>

  const firstName = user?.fullName?.split(' ')[0] || 'there'
  const role = data?.role

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: '#0F2847' }}>Welcome back, {firstName}</div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
            {role === 'Approver' && "Here's what's waiting on your review"}
            {role === 'Launch Manager' && "Here's what needs your attention today"}
            {role === 'Team Member' && "Here's what's on your plate"}
            {role === 'Executive Viewer' && "Here's a portfolio-wide view of all launches"}
            {role === 'Admin' && "Here's the full system overview"}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="live-indicator">
            <span className="live-dot"></span> Live
          </span>
          {(role === 'Executive Viewer' || role === 'Admin') && (
            <button onClick={exportSnapshot} className="btn btn-outline btn-sm"><Download size={13} /> Export snapshot</button>
          )}
        </div>
      </div>

      {/* Needs Action section — everyone except pure Executive Viewer */}
      {role !== 'Executive Viewer' && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>Needs action</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>

            {(role === 'Approver' || role === 'Admin') && data?.pendingApprovals?.length > 0 && (
              <div onClick={() => navigate('/launches')} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#FEF4E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={17} color="#D4820A" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847' }}>Gates awaiting your approval</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {data.pendingApprovals.slice(0, 2).map(p => `${p.stageName} · ${p.launchName}`).join(', ')}
                  </div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '500', color: '#D4820A' }}>{data.pendingApprovals.length}</div>
              </div>
            )}

            {data?.overdueTasks?.length > 0 && (
              <div onClick={() => navigate('/launches')} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#FDECEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={17} color="#C8362E" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847' }}>
                    {role === 'Team Member' ? 'Your overdue tasks' : 'Overdue tasks across launches'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{data.overdueTasks[0]?.name}{data.overdueTasks.length > 1 ? ` and ${data.overdueTasks.length - 1} more` : ''}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '500', color: '#C8362E' }}>{data.overdueTasks.length}</div>
              </div>
            )}

            {role === 'Team Member' && data?.myTasksDueSoon?.length > 0 && (
              <div onClick={() => navigate('/launches')} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#EBF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarClock size={17} color="#1A6FD4" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847' }}>Due in the next 7 days</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{data.myTasksDueSoon[0]?.name}{data.myTasksDueSoon.length > 1 ? ` and ${data.myTasksDueSoon.length - 1} more` : ''}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '500', color: '#1A6FD4' }}>{data.myTasksDueSoon.length}</div>
              </div>
            )}

            {(role === 'Launch Manager' || role === 'Admin') && data?.riskLaunches?.length > 0 && (
              <div onClick={() => navigate('/launches')} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#FDECEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldAlert size={17} color="#C8362E" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847' }}>Launches at risk</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{data.riskLaunches.map(l => l.productName).join(', ')}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '500', color: '#C8362E' }}>{data.riskLaunches.length}</div>
              </div>
            )}

            {data?.pendingApprovals?.length === 0 && data?.overdueTasks?.length === 0 && data?.riskLaunches?.length === 0 && (!data?.myTasksDueSoon || data.myTasksDueSoon.length === 0) && (
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
                <CheckCheck size={20} color="#0D9E7A" />
                <span style={{ fontSize: '13px', color: '#374151' }}>Nothing urgent right now — everything's on track.</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Snapshot metrics — everyone */}
      <div style={{ fontSize: '11px', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>Portfolio snapshot</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
        <div className="stat-card"><div className="stat-value" style={{ color: '#1A6FD4' }}>{data?.totals?.active || 0}</div><div className="stat-label">Active launches</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#0D9E7A' }}>{data?.upcomingCount || 0}</div><div className="stat-label">Launching in 90 days</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#D4820A' }}>{data?.pendingApprovals?.length || 0}</div><div className="stat-label">Pending approvals</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#C8362E' }}>{data?.overdueTasks?.length || 0}</div><div className="stat-label">Overdue tasks</div></div>
      </div>

      {/* Launch list — everyone, framed differently for viewer vs doer */}
      <div style={{ fontSize: '11px', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
        {role === 'Executive Viewer' || role === 'Admin' ? 'All launches' : 'Active launches'}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {data?.allLaunchesSummary?.filter(l => role === 'Executive Viewer' || role === 'Admin' || l.status === 'Active').length === 0 ? (
          <div className="empty-state">
            <Rocket size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div style={{ fontSize: '13px' }}>No launches yet</div>
          </div>
        ) : (
          data.allLaunchesSummary
            .filter(l => role === 'Executive Viewer' || role === 'Admin' || l.status === 'Active')
            .map(l => (
              <div key={l.id} onClick={() => navigate(`/launches/${l.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847' }}>{l.productName}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{l.currentStage} · {l.productCode}</div>
                </div>
                <div className="prog" style={{ width: '70px' }}><div className="prog-fill" style={{ width: `${l.progress}%`, background: '#1A6FD4' }} /></div>
                <span style={{ fontSize: '11px', color: '#6B7280', width: '32px' }}>{l.progress}%</span>
                <span className={`badge ${riskBadge(l.riskLevel)}`} style={{ flexShrink: 0 }}>
                  {l.riskLevel === 'Low' ? 'On track' : `${l.riskLevel} risk`}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  )
}