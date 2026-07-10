import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import dayjs from 'dayjs'
import { canViewAuditTrail } from '../store/permissions'
import { ShieldOff } from 'lucide-react'

const eventBadge = (e) => {
  if (e === 'LOGIN') return 'badge-purple'
  if (e === 'APPROVE') return 'badge-teal'
  if (e === 'CREATE') return 'badge-blue'
  if (e === 'UPDATE') return 'badge-amber'
  if (e === 'REJECT' || e === 'CHANGES_REQUESTED') return 'badge-red'
  return 'badge-gray'
}

export default function AuditTrail() {
  const [entityType, setEntityType] = useState('')
  const [eventType, setEventType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', entityType, eventType, page],
    queryFn: () => api.get('/audit', { params: { entityType, eventType, page, limit: 20 } }).then(r => r.data)
  })

  if (!canViewAuditTrail()) {
    return (
      <div className="empty-state" style={{ padding: '80px' }}>
        <ShieldOff size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <div className="empty-state-title">Restricted access</div>
        <div className="empty-state-desc">The audit trail is only available to Admin users.</div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Audit trail</div>
          <div className="page-subtitle">Complete history of all user actions and system events</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <select className="form-input" style={{ width: 'auto' }} value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1) }}>
          <option value="">All entity types</option>
          <option value="Launch">Launch</option>
          <option value="GateReview">Gate review</option>
          <option value="User">User</option>
          <option value="Stage">Stage</option>
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1) }}>
          <option value="">All event types</option>
          <option value="LOGIN">Login</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="APPROVE">Approve</option>
          <option value="REJECT">Reject</option>
          <option value="REOPEN">Reopen</option>
          <option value="CHANGES_REQUESTED">Changes requested</option>
        </select>
        {(entityType || eventType) && (
          <button onClick={() => { setEntityType(''); setEventType(''); setPage(1) }} className="btn btn-outline btn-sm">Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9CA3AF' }}>{data?.total || 0} total records</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state">Loading audit trail...</div>
        ) : !data?.logs || data.logs.length === 0 ? (
          <div className="empty-state">No audit records found</div>
        ) : (
          <table className="data-table">
            <thead><tr>{['Time', 'User', 'Event', 'Entity', 'Entity ID', 'Details'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {data.logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: '#6B7280', whiteSpace: 'nowrap', fontSize: '12px' }}>{dayjs(log.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="avatar" style={{ width: '22px', height: '22px', fontSize: '9px' }}>{log.user?.fullName?.charAt(0) || '?'}</div>
                      <span>{log.user?.fullName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${eventBadge(log.eventType)}`}>{log.eventType}</span></td>
                  <td style={{ color: '#6B7280' }}>{log.entityType}</td>
                  <td style={{ fontSize: '12px', color: '#374151', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.entityLabel || <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#9CA3AF' }}>{log.entityId?.substring(0, 8)}…</span>}
                  </td>
                  <td>
                    {log.newValue && (
                      <code style={{ fontSize: '11px', background: '#F9FAFB', padding: '2px 8px', borderRadius: '5px', color: '#6B7280', display: 'inline-block', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Object.entries(log.newValue).slice(0, 3).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')}
                      </code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data?.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">← Previous</button>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>Page {page} of {data.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn btn-primary btn-sm">Next →</button>
        </div>
      )}
    </div>
  )
}