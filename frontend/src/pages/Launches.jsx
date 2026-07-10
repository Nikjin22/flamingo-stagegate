import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, Copy, Archive, Trash2, X } from 'lucide-react'
import { canDeleteLaunch, canArchiveLaunch } from '../store/permissions'

export default function Launches() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    productName: '', productCode: '', category: 'Generic Medicine',
    businessUnit: '', region: 'United Kingdom', priority: 'High',
    targetLaunchDate: '', description: ''
  })

  const { data: launches, isLoading } = useQuery({
    queryKey: ['launches'],
    queryFn: () => api.get('/launches').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/launches', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['launches'])
      toast.success('Launch created successfully')
      setShowCreate(false)
      setForm({ productName: '', productCode: '', category: 'Generic Medicine', businessUnit: '', region: 'United Kingdom', priority: 'High', targetLaunchDate: '', description: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create launch')
  })

  const cloneMutation = useMutation({
    mutationFn: (id) => api.post(`/launches/${id}/clone`),
    onSuccess: () => {
      queryClient.invalidateQueries(['launches'])
      toast.success('Launch cloned successfully')
    }
  })

  const archiveMutation = useMutation({
    mutationFn: (id) => api.patch(`/launches/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries(['launches'])
      toast.success('Launch archived')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/launches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['launches'])
      toast.success('Launch deleted')
    },
    onError: () => toast.error('Failed to delete launch')
  })

  const filtered = (launches?.filter(l =>
    l.productName.toLowerCase().includes(search.toLowerCase()) ||
    l.productCode.toLowerCase().includes(search.toLowerCase()) ||
    l.businessUnit?.toLowerCase().includes(search.toLowerCase())
  ) || []).sort((a, b) => {
    let aVal = a[sortField] || ''
    let bVal = b[sortField] || ''
    if (sortField === 'targetLaunchDate') {
      aVal = aVal ? new Date(aVal) : new Date(0)
      bVal = bVal ? new Date(bVal) : new Date(0)
    } else {
      aVal = aVal.toString().toLowerCase()
      bVal = bVal.toString().toLowerCase()
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const priorityBadge = (p) => p === 'High' ? 'badge-red' : p === 'Medium' ? 'badge-amber' : 'badge-teal'
  const statusBadge = (s) => s === 'Active' ? 'badge-teal' : s === 'Completed' ? 'badge-purple' : s === 'Delayed' ? 'badge-amber' : s === 'Archived' ? 'badge-gray' : 'badge-blue'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Product launches</div>
          <div className="page-subtitle">Manage all Flamingo Pharma UK product launches</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New launch
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: '16px' }}>
        <Search size={15} color="#9CA3AF" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name, code or business unit..." />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state">Loading launches...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💊</div>
            <div className="empty-state-title">No launches found</div>
            <div className="empty-state-desc">Try adjusting your search or create a new launch</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {[
                  { label: 'Product name', field: 'productName' },
                  { label: 'Code', field: 'productCode' },
                  { label: 'Business unit', field: 'businessUnit' },
                  { label: 'Region', field: 'region' },
                  { label: 'Priority', field: 'priority' },
                  { label: 'Status', field: 'status' },
                  { label: 'Target date', field: 'targetLaunchDate' },
                  { label: 'Actions', field: null },
                ].map(h => (
                  <th key={h.label}
                    onClick={() => {
                      if (!h.field) return
                      if (sortField === h.field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                      else { setSortField(h.field); setSortDir('asc') }
                    }}
                  >
                    {h.label}
                    {h.field && sortField === h.field && <span style={{ marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: '500', color: '#0F2847' }}>{l.productName}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{l.category}</div>
                  </td>
                  <td style={{ color: '#6B7280', fontFamily: 'monospace', fontSize: '12px' }}>{l.productCode}</td>
                  <td style={{ color: '#6B7280' }}>{l.businessUnit || '—'}</td>
                  <td style={{ color: '#6B7280' }}>{l.region || '—'}</td>
                  <td><span className={`badge ${priorityBadge(l.priority)}`}>{l.priority}</span></td>
                  <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                  <td style={{ color: '#6B7280' }}>{l.targetLaunchDate ? new Date(l.targetLaunchDate).toLocaleDateString('en-GB') : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => navigate(`/launches/${l.id}`)} title="View" style={{ padding: '6px', border: 'none', borderRadius: '6px', background: '#EBF3FD', color: '#1A6FD4', cursor: 'pointer' }}>
                        <Eye size={15} />
                      </button>
                      <button onClick={() => cloneMutation.mutate(l.id)} title="Clone" style={{ padding: '6px', border: 'none', borderRadius: '6px', background: '#E6F7F2', color: '#0D9E7A', cursor: 'pointer' }}>
                        <Copy size={15} />
                      </button>
                      {canArchiveLaunch() && (
                        <button onClick={() => archiveMutation.mutate(l.id)} title="Archive" style={{ padding: '6px', border: 'none', borderRadius: '6px', background: '#FEF4E4', color: '#D4820A', cursor: 'pointer' }}>
                          <Archive size={15} />
                        </button>
                      )}
                      {canDeleteLaunch() && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${l.productName}"? This cannot be undone.`)) {
                              deleteMutation.mutate(l.id)
                            }
                          }}
                          title="Delete"
                          style={{ padding: '6px', border: 'none', borderRadius: '6px', background: '#FDECEA', color: '#C8362E', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Create new launch</span>
              <button onClick={() => setShowCreate(false)} className="icon-btn"><X size={18} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Product name</label>
              <input className="form-input" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Metformin Hydrochloride 500mg" />
            </div>
            <div className="form-group">
              <label className="form-label">Product code</label>
              <input className="form-input" value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} placeholder="e.g. FP-UK-MET-500" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Business unit</label>
                <input className="form-input" value={form.businessUnit} onChange={(e) => setForm({ ...form, businessUnit: e.target.value })} placeholder="e.g. Oral Solid Dosage" />
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <input className="form-input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target launch date</label>
                <input type="date" className="form-input" value={form.targetLaunchDate} onChange={(e) => setForm({ ...form, targetLaunchDate: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.productName || !form.productCode || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create launch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}