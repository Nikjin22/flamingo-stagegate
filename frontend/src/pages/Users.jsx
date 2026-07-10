import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import { UserPlus, Shield, X, Search } from 'lucide-react'
import { canManageUsers } from '../store/permissions'

export default function Users() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showRoles, setShowRoles] = useState(null)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => api.get('/users').then(r => r.data)
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users'])
      toast.success('User created successfully')
      setShowCreate(false)
      setForm({ fullName: '', email: '', password: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user')
  })

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }) => api.post(`/users/${userId}/roles`, { roleId }),
    onSuccess: () => { queryClient.invalidateQueries(['all-users']); toast.success('Role assigned') }
  })

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }) => api.delete(`/users/${userId}/roles/${roleId}`),
    onSuccess: () => { queryClient.invalidateQueries(['all-users']); toast.success('Role removed') }
  })

  const filtered = users?.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div>
      {!canManageUsers() && (
        <div style={{ background: '#FEF4E4', border: '0.5px solid rgba(212,130,10,0.2)', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '12px', color: '#D4820A' }}>
          ⚠ You have view-only access to this page. Only Admins can add users or manage roles.
        </div>
      )}
      <div className="page-header">
        <div>
          <div className="page-title">User management</div>
          <div className="page-subtitle">Manage Flamingo Pharma system users and roles</div>
        </div>
        {canManageUsers() && (
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"><UserPlus size={15} /> Add user</button>
        )}
      </div>

      <div className="search-bar" style={{ marginBottom: '16px' }}>
        <Search size={15} color="#9CA3AF" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state">Loading users...</div>
        ) : (
          <table className="data-table">
            <thead><tr>{['User', 'Email', 'Roles', 'Status', 'Created', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="avatar">{u.fullName.charAt(0)}</div>
                      <span style={{ fontWeight: '500', color: '#0F2847' }}>{u.fullName}</span>
                    </div>
                  </td>
                  <td style={{ color: '#6B7280' }}>{u.email}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {u.userRoles?.map(ur => <span key={ur.id} className="badge badge-purple">{ur.role.name}</span>)}
                    </div>
                  </td>
                  <td><span className={`badge ${u.isActive ? 'badge-teal' : 'badge-gray'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ color: '#6B7280' }}>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                  <td>
                    {canManageUsers() ? (
                      <button onClick={() => setShowRoles(u)} title="Manage roles" style={{ padding: '6px', border: 'none', borderRadius: '6px', background: '#F0ECFB', color: '#6B4FBB', cursor: 'pointer' }}>
                        <Shield size={15} />
                      </button>
                    ) : (
                      <span style={{ color: '#D1D5DB', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Add new user</span>
              <button onClick={() => setShowCreate(false)} className="icon-btn"><X size={18} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} className="btn btn-outline">Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.fullName || !form.email || !form.password} className="btn btn-primary">Create user</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Roles Modal */}
      {showRoles && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Manage roles — {showRoles.fullName}</span>
              <button onClick={() => setShowRoles(null)} className="icon-btn"><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roles?.map(role => {
                const hasRole = showRoles.userRoles?.some(ur => ur.role.id === role.id)
                return (
                  <div key={role.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: hasRole ? '#F0ECFB' : '#F9FAFB', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '13px', color: '#0F2847' }}>{role.name}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{role.description}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (hasRole) {
                          removeRoleMutation.mutate({ userId: showRoles.id, roleId: role.id })
                        } else {
                          assignRoleMutation.mutate({ userId: showRoles.id, roleId: role.id })
                        }
                      }}
                      className={hasRole ? 'btn btn-danger btn-xs' : 'btn btn-blue btn-xs'}
                    >
                      {hasRole ? 'Remove' : 'Assign'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}