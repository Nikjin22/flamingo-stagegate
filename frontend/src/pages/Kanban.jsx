import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'

const columns = [
  { key: 'Not Started', label: 'Not started', color: '#9CA3AF' },
  { key: 'In Progress',  label: 'In progress',  color: '#1A6FD4' },
  { key: 'Blocked',      label: 'Blocked',      color: '#C8362E' },
  { key: 'Completed',    label: 'Completed',    color: '#0D9E7A' },
]

const priorityBadge = (p) => p === 'High' ? 'badge-red' : p === 'Medium' ? 'badge-amber' : 'badge-teal'

function TaskCard({ task, onClick }) {
  const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs()) && task.status !== 'Completed'
  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
      className="card"
      style={{ padding: '10px 12px', marginBottom: '8px', cursor: 'pointer' }}
    >
      <div style={{ fontSize: '12px', color: '#374151', marginBottom: '8px', lineHeight: '1.4' }}>{task.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className={`badge ${priorityBadge(task.priority)}`} style={{ fontSize: '10px' }}>{task.priority}</span>
        {task.assignee && (
          <div className="avatar" style={{ width: '20px', height: '20px', fontSize: '9px' }}>{task.assignee.fullName.charAt(0)}</div>
        )}
      </div>
      {task.dueDate && (
        <div style={{ fontSize: '10px', marginTop: '6px', color: isOverdue ? '#C8362E' : '#9CA3AF', fontWeight: isOverdue ? '500' : '400' }}>
          📅 {isOverdue ? '⚠ Overdue · ' : ''}{dayjs(task.dueDate).format('DD MMM YYYY')}
        </div>
      )}
      {task.dependsOn && (
        <div style={{ fontSize: '10px', marginTop: '4px', color: task.dependsOn.status === 'Completed' ? '#0D9E7A' : '#D4820A' }}>
          {task.dependsOn.status === 'Completed' ? '✅ Ready' : `⛓ Waiting: ${task.dependsOn.name.substring(0, 18)}...`}
        </div>
      )}
    </div>
  )
}

export default function Kanban() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [view, setView] = useState('kanban')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [showBulkPanel, setShowBulkPanel] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkAssignee, setBulkAssignee] = useState('')
  const [bulkPriority, setBulkPriority] = useState('')
  const [newTask, setNewTask] = useState({ name: '', priority: 'High', stageId: '', dueDate: '', assigneeId: '' })

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.get(`/launches/${id}/tasks`).then(r => r.data),
    refetchInterval: 5000
  })

  const { data: launch } = useQuery({
    queryKey: ['launch', id],
    queryFn: () => api.get(`/launches/${id}`).then(r => r.data),
    refetchInterval: 5000
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data)
  })

  const updateMutation = useMutation({
    mutationFn: ({ taskId, ...data }) => api.patch(`/launches/${id}/tasks/${taskId}`, data),
    onSuccess: () => { refetch(); queryClient.invalidateQueries(['tasks', id]) }
  })

  const deleteMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/launches/${id}/tasks/${taskId}`),
    onSuccess: () => { toast.success('Task deleted'); refetch(); queryClient.invalidateQueries(['tasks', id]) },
    onError: () => toast.error('Failed to delete task')
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/launches/${id}/tasks`, data),
    onSuccess: () => {
      toast.success('Task created')
      setShowCreate(false)
      setNewTask({ name: '', priority: 'High', stageId: '', dueDate: '', assigneeId: '' })
      refetch()
    }
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: (data) => api.patch(`/launches/${id}/tasks/bulk`, data),
    onSuccess: () => {
      toast.success(`${selectedTasks.length} tasks updated`)
      setSelectedTasks([]); setShowBulkPanel(false); setBulkStatus(''); setBulkAssignee(''); setBulkPriority('')
      refetch()
    },
    onError: () => toast.error('Failed to bulk update tasks')
  })

  const handleBulkUpdate = () => {
    const data = { taskIds: selectedTasks }
    if (bulkStatus) data.status = bulkStatus
    if (bulkAssignee) data.assigneeId = bulkAssignee
    if (bulkPriority) data.priority = bulkPriority
    if (!bulkStatus && !bulkAssignee && !bulkPriority) { toast.error('Please select at least one field to update'); return }
    bulkUpdateMutation.mutate(data)
  }

  const toggleTask = (taskId) => setSelectedTasks(prev => prev.includes(taskId) ? prev.filter(i => i !== taskId) : [...prev, taskId])
  const selectAll = () => setSelectedTasks(selectedTasks.length === tasks?.length ? [] : (tasks?.map(t => t.id) || []))

  const handleDrop = (e, status) => {
    const taskId = e.dataTransfer.getData('taskId')
    updateMutation.mutate({ taskId, status })
    setDragOver(null)
  }

  return (
    <div>
      <button onClick={() => navigate(`/launches/${id}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#1A6FD4', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to launch
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div className="page-title">Task board</div>
          <div className="page-subtitle">{launch?.productName} · {tasks?.length || 0} tasks total</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectedTasks.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#EBF3FD', padding: '6px 12px', borderRadius: '8px', border: '0.5px solid rgba(26,111,212,0.2)' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#1A6FD4' }}>{selectedTasks.length} selected</span>
              <button onClick={() => setShowBulkPanel(!showBulkPanel)} className="btn btn-blue btn-xs">Bulk update</button>
              <button onClick={() => setSelectedTasks([])} className="btn btn-outline btn-xs">Clear</button>
            </div>
          )}
          <div className="tabs">
            <div className={`tab-item ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Kanban</div>
            <div className={`tab-item ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={14} /> Add task</button>
        </div>
      </div>

      {launch?.stages?.some(s => s.ownerId) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {launch.stages.filter(s => s.ownerId).map(stage => {
            const owner = users?.find(u => u.id === stage.ownerId)
            if (!owner) return null
            return (
              <div key={stage.id} className="badge badge-blue" style={{ padding: '5px 10px' }}>
                <div className="avatar" style={{ width: '16px', height: '16px', fontSize: '8px' }}>{owner.fullName.charAt(0)}</div>
                {stage.name} owner: {owner.fullName}
              </div>
            )
          })}
        </div>
      )}

      {showBulkPanel && selectedTasks.length > 0 && (

        <div style={{ background: '#EBF3FD', borderRadius: '10px', padding: '14px 18px', marginBottom: '14px', border: '0.5px solid rgba(26,111,212,0.2)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#1A6FD4' }}>Update {selectedTasks.length} tasks:</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="form-input" style={{ width: 'auto', background: 'white' }}>
            <option value="">— Status —</option>
            {columns.map(c => <option key={c.key}>{c.key}</option>)}
          </select>
          <select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)} className="form-input" style={{ width: 'auto', background: 'white' }}>
            <option value="">— Priority —</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
          <select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} className="form-input" style={{ width: 'auto', background: 'white' }}>
            <option value="">— Assign to —</option>
            {users?.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
          <button onClick={handleBulkUpdate} disabled={bulkUpdateMutation.isPending} className="btn btn-primary btn-sm">{bulkUpdateMutation.isPending ? 'Updating...' : 'Apply'}</button>
          <button onClick={() => setShowBulkPanel(false)} className="btn btn-outline btn-sm">Cancel</button>
        </div>
      )}

      {view === 'kanban' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {columns.map(col => {
            const colTasks = tasks?.filter(t => t.status === col.key) || []
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.key) }}
                onDrop={(e) => handleDrop(e, col.key)}
                style={{ background: dragOver === col.key ? '#F0F4FA' : '#F4F6FA', borderRadius: '10px', padding: '10px', minHeight: '300px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#0F2847' }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1px 7px' }}>{colTasks.length}</span>
                </div>
                {colTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />)}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                {['', 'Task name', 'Stage', 'Assignee', 'Priority', 'Status', 'Due date', 'Progress', ''].map((h, hi) => (
                  <th key={h}>
                    {hi === 0 ? (
                      <input type="checkbox" checked={selectedTasks.length === tasks?.length && tasks?.length > 0} onChange={selectAll} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                    ) : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks?.map(task => (
                <tr key={task.id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={() => toggleTask(task.id)} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                  </td>
                  <td>
                    <div style={{ fontWeight: '500', color: '#0F2847' }}>{task.name}</div>
                    {task.dependsOn && (
                      <div style={{ fontSize: '10px', marginTop: '3px', color: task.dependsOn.status === 'Completed' ? '#0D9E7A' : '#D4820A' }}>
                        {task.dependsOn.status === 'Completed' ? '✅' : '⛓'} Depends on: {task.dependsOn.name}
                      </div>
                    )}
                  </td>
                  <td style={{ color: '#6B7280' }}>{task.stage?.name || '—'}</td>
                  <td>{task.assignee ? <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div className="avatar" style={{ width: '20px', height: '20px', fontSize: '9px' }}>{task.assignee.fullName.charAt(0)}</div>{task.assignee.fullName}</div> : <span style={{ color: '#D1D5DB' }}>Unassigned</span>}</td>
                  <td><span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span></td>
                  <td><span className="badge badge-blue">{task.status}</span></td>
                  <td style={{ color: '#6B7280' }}>{task.dueDate ? dayjs(task.dueDate).format('DD/MM/YYYY') : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="prog" style={{ width: '60px' }}><div className="prog-fill" style={{ width: `${task.completionPct}%`, background: '#1A6FD4' }} /></div>
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>{task.completionPct}%</span>
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete task "${task.name}"? This cannot be undone.`)) {
                          deleteMutation.mutate(task.id)
                        }
                      }}
                      style={{ padding: '5px', border: 'none', borderRadius: '6px', background: '#FDECEA', color: '#C8362E', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Add new task</span>
              <button onClick={() => setShowCreate(false)} className="icon-btn"><X size={18} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Task name</label>
              <input className="form-input" value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="form-input" value={newTask.stageId} onChange={(e) => setNewTask({ ...newTask, stageId: e.target.value })}>
                <option value="">Select stage</option>
                {launch?.stages?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due date</label>
                <input type="date" className="form-input" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Assign to</label>
              <select className="form-input" value={newTask.assigneeId} onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {users?.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} className="btn btn-outline">Cancel</button>
              <button onClick={() => createMutation.mutate(newTask)} disabled={!newTask.name || !newTask.stageId} className="btn btn-primary">Create task</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {selectedTask && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Edit task</span>
              <button onClick={() => setSelectedTask(null)} className="icon-btn"><X size={18} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Task name</label>
              <input className="form-input" value={selectedTask.name} onChange={(e) => setSelectedTask({ ...selectedTask, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={selectedTask.status} onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value })}>
                  {columns.map(c => <option key={c.key}>{c.key}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={selectedTask.priority} onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Due date</label>
                <input type="date" className="form-input" value={selectedTask.dueDate ? selectedTask.dueDate.split('T')[0] : ''} onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Completion %</label>
                <input type="number" min="0" max="100" className="form-input" value={selectedTask.completionPct} onChange={(e) => setSelectedTask({ ...selectedTask, completionPct: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Assign to</label>
              <select className="form-input" value={selectedTask.assigneeId || ''} onChange={(e) => setSelectedTask({ ...selectedTask, assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {users?.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Depends on (blocks this task until complete)</label>
              <select className="form-input" value={selectedTask.dependsOnId || ''} onChange={(e) => setSelectedTask({ ...selectedTask, dependsOnId: e.target.value })}>
                <option value="">No dependency</option>
                {tasks?.filter(t => t.id !== selectedTask.id).map(t => (
                  <option key={t.id} value={t.id}>{t.status === 'Completed' ? '✓' : '○'} {t.name}</option>
                ))}
              </select>
              {selectedTask.dependsOnId && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#9CA3AF' }}>
                  {tasks?.find(t => t.id === selectedTask.dependsOnId)?.status === 'Completed' ? '✅ Dependency completed — this task can proceed' : '⚠ Waiting for dependency to complete'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedTask(null)} className="btn btn-outline">Cancel</button>
              <button
                onClick={() => {
                  updateMutation.mutate({
                    taskId: selectedTask.id, name: selectedTask.name, status: selectedTask.status,
                    priority: selectedTask.priority, dueDate: selectedTask.dueDate || null,
                    completionPct: selectedTask.completionPct, assigneeId: selectedTask.assigneeId || null,
                    dependsOnId: selectedTask.dependsOnId || null
                  })
                  setSelectedTask(null)
                  toast.success('Task updated')
                }}
                className="btn btn-primary"
              >Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}