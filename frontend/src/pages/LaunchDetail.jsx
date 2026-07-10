import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ChevronDown, ChevronUp, Plus,
  Activity, MessageSquare, Send, ListTodo, Edit, X, BarChart2
} from 'lucide-react'
import Documents from '../components/Documents'
import { canApproveGate, canReopenStage, canAssignStageOwner, canSubmitStage, canAddTask, canEditLaunch, canToggleTask } from '../store/permissions'
const statusBadge = (s) => ({
  'Not Started': 'badge-gray', 'In Progress': 'badge-blue',
  'Under Review': 'badge-amber', 'Completed': 'badge-teal', 'Blocked': 'badge-red'
}[s] || 'badge-gray')

const priorityBadge = (p) => p === 'High' ? 'badge-red' : p === 'Medium' ? 'badge-amber' : 'badge-teal'

// ─── Stage Date Picker ───────────────────────────────────────────────────────
function StageDatePicker({ stage, launchId, onRefresh }) {
  const [show, setShow] = useState(false)
  const btnRef = useRef(null)
  const [openUpward, setOpenUpward] = useState(false)

  const toggleShow = () => {
    if (!show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUpward(spaceBelow < 200)
    }
    setShow(!show)
  }
  const [dueDate, setDueDate] = useState(stage.dueDate ? new Date(stage.dueDate).toISOString().split('T')[0] : '')

  const updateMutation = useMutation({
    mutationFn: (date) => api.patch(`/launches/${launchId}/stages/${stage.id}`, { dueDate: date }),
    onSuccess: () => { toast.success('Stage due date updated'); setShow(false); onRefresh() },
    onError: () => toast.error('Failed to update due date')
  })

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} onClick={toggleShow} className="btn btn-outline btn-xs">📅 Due date</button>
      {show && (
        <div style={{ position: 'absolute', [openUpward ? 'bottom' : 'top']: '32px', right: 0, zIndex: 100, background: 'white', borderRadius: '10px', padding: '14px', boxShadow: '0 12px 28px rgba(0,0,0,0.15)', border: '0.5px solid rgba(0,0,0,0.08)', minWidth: '230px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '10px' }}>Set due date for {stage.name}</div>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="form-input" style={{ marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShow(false)} className="btn btn-outline btn-xs">Cancel</button>
            <button onClick={() => updateMutation.mutate(dueDate)} disabled={!dueDate || updateMutation.isPending} className="btn btn-blue btn-xs">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stage Owner Picker ──────────────────────────────────────────────────────
function StageOwnerPicker({ stage, launchId, onRefresh }) {
  const [show, setShow] = useState(false)
  const btnRef = useRef(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })

  const updateMutation = useMutation({
    mutationFn: (id) => api.patch(`/launches/${launchId}/stages/${stage.id}`, { ownerId: id }),
    onSuccess: () => { toast.success('Stage owner updated'); setShow(false); onRefresh() },
    onError: () => toast.error('Failed to update owner')
  })

  const toggleShow = () => {
    if (!show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < 340
      setCoords({
        top: openUpward ? rect.top - 8 : rect.bottom + 8,
        left: Math.min(rect.right - 220, window.innerWidth - 230),
        openUpward
      })
    }
    setShow(!show)
  }

  useEffect(() => {
    if (!show) return
    const close = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) && !e.target.closest('.owner-dropdown-portal')) setShow(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [show])

  const currentOwner = users?.find(u => u.id === stage.ownerId)

  return (
    <>
      <button ref={btnRef} onClick={toggleShow} className="btn btn-outline btn-xs">
        {currentOwner ? (
          <><div className="avatar" style={{ width: '16px', height: '16px', fontSize: '8px' }}>{currentOwner.fullName.charAt(0)}</div>{currentOwner.fullName.split(' ')[0]}</>
        ) : '👤 Owner'}
      </button>

      {show && createPortal(
        <div
          className="owner-dropdown-portal"
          style={{
            position: 'fixed',
            top: coords.openUpward ? 'auto' : coords.top,
            bottom: coords.openUpward ? (window.innerHeight - coords.top) : 'auto',
            left: coords.left, zIndex: 9999,
            background: 'white', borderRadius: '10px', padding: '10px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.2)', border: '0.5px solid rgba(0,0,0,0.08)',
            minWidth: '220px', maxHeight: '320px', display: 'flex', flexDirection: 'column'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '8px', padding: '0 4px', flexShrink: 0 }}>Assign owner</div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div onClick={() => updateMutation.mutate(null)} style={{ padding: '7px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#9CA3AF', background: !stage.ownerId ? '#EBF3FD' : 'transparent' }}>— Unassigned</div>
            {users?.map(u => (
              <div key={u.id} onClick={() => updateMutation.mutate(u.id)} style={{ padding: '7px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: stage.ownerId === u.id ? '#EBF3FD' : 'transparent', fontSize: '12px' }}>
                <div className="avatar" style={{ width: '22px', height: '22px', fontSize: '10px', flexShrink: 0 }}>{u.fullName.charAt(0)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>{u.fullName}</div>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                {stage.ownerId === u.id && <span style={{ marginLeft: 'auto', color: '#1A6FD4', flexShrink: 0 }}>✓</span>}
              </div>
            ))}
          </div>
          <button onClick={() => setShow(false)} className="btn btn-outline btn-xs" style={{ width: '100%', justifyContent: 'center', marginTop: '6px', flexShrink: 0 }}>Close</button>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Task Assignee Picker (used inside stage cards) ──────────────────────────
function TaskAssigneePicker({ task, launchId, onRefresh }) {
  const [show, setShow] = useState(false)
  const btnRef = useRef(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false })

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })

  const updateMutation = useMutation({
    mutationFn: (assigneeId) => api.patch(`/launches/${launchId}/tasks/${task.id}`, { assigneeId }),
    onSuccess: () => { toast.success('Task assignee updated'); setShow(false); onRefresh() },
    onError: () => toast.error('Failed to update assignee')
  })

  const toggleShow = () => {
    if (!show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < 300
      setCoords({ top: openUpward ? rect.top - 8 : rect.bottom + 8, left: Math.min(rect.right - 200, window.innerWidth - 220), openUpward })
    }
    setShow(!show)
  }

  useEffect(() => {
    if (!show) return
    const close = (e) => { if (btnRef.current && !btnRef.current.contains(e.target) && !e.target.closest('.assignee-dropdown-portal')) setShow(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [show])

  const currentAssignee = users?.find(u => u.id === task.assigneeId)

  return (
    <>
      <button ref={btnRef} onClick={toggleShow} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '14px', border: '0.5px solid rgba(0,0,0,0.1)', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#374151', flexShrink: 0 }}>
        {currentAssignee ? (
          <><div className="avatar" style={{ width: '16px', height: '16px', fontSize: '8px' }}>{currentAssignee.fullName.charAt(0)}</div>{currentAssignee.fullName.split(' ')[0]}</>
        ) : <span style={{ color: '#9CA3AF' }}>👤 Assign</span>}
      </button>

      {show && createPortal(
        <div className="assignee-dropdown-portal" style={{
          position: 'fixed', top: coords.openUpward ? 'auto' : coords.top, bottom: coords.openUpward ? (window.innerHeight - coords.top) : 'auto',
          left: coords.left, zIndex: 9999, background: 'white', borderRadius: '10px', padding: '10px',
          boxShadow: '0 12px 28px rgba(0,0,0,0.2)', border: '0.5px solid rgba(0,0,0,0.08)', minWidth: '200px', maxHeight: '280px', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '6px', padding: '0 4px', flexShrink: 0 }}>Assign task</div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div onClick={() => updateMutation.mutate(null)} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#9CA3AF', background: !task.assigneeId ? '#EBF3FD' : 'transparent' }}>— Unassigned</div>
            {users?.map(u => (
              <div key={u.id} onClick={() => updateMutation.mutate(u.id)} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: task.assigneeId === u.id ? '#EBF3FD' : 'transparent', fontSize: '12px' }}>
                <div className="avatar" style={{ width: '20px', height: '20px', fontSize: '9px', flexShrink: 0 }}>{u.fullName.charAt(0)}</div>
                <span style={{ whiteSpace: 'nowrap' }}>{u.fullName}</span>
                {task.assigneeId === u.id && <span style={{ marginLeft: 'auto', color: '#1A6FD4' }}>✓</span>}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Stage Card ──────────────────────────────────────────────────────────────
function StageCard({ stage, launchId, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [taskPriority, setTaskPriority] = useState('High')

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/launches/${launchId}/stages/${stage.id}/submit`, { comments: 'Submitting stage for gate review' }),
    onSuccess: () => { toast.success(`${stage.name} submitted for review`); onRefresh() },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit')
  })

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/launches/${launchId}/stages/${stage.id}/approve`, { comments: 'Gate approved' }),
    onSuccess: () => { toast.success(`${stage.name} approved!`); onRefresh() },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to approve')
  })

  const requestChangesMutation = useMutation({
    mutationFn: () => api.post(`/launches/${launchId}/stages/${stage.id}/request-changes`, { comments: 'Please review and address the requested changes before resubmitting' }),
    onSuccess: () => { toast.success(`Changes requested for ${stage.name}`); onRefresh() },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to request changes')
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/launches/${launchId}/stages/${stage.id}/reject`, { comments: 'Gate rejected — please review' }),
    onSuccess: () => { toast.success(`${stage.name} rejected`); onRefresh() }
  })

  const reopenMutation = useMutation({
    mutationFn: () => api.post(`/launches/${launchId}/stages/${stage.id}/reopen`, { comments: 'Stage reopened for rework' }),
    onSuccess: () => { toast.success(`${stage.name} reopened`); onRefresh() },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reopen')
  })

  const createTaskMutation = useMutation({
    mutationFn: (data) => api.post(`/launches/${launchId}/tasks`, data),
    onSuccess: () => { toast.success('Task added'); setShowTaskForm(false); setTaskName(''); onRefresh() }
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }) => api.patch(`/launches/${launchId}/tasks/${taskId}`, { status }),
    onSuccess: () => onRefresh()
  })

  const completedTasks = stage.tasks?.filter(t => t.status === 'Completed').length || 0
  const totalTasks = stage.tasks?.length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : stage.completionPct

  return (
    <div className="card" style={{
      marginBottom: '10px', padding: 0, overflow: 'hidden',
      borderLeft: stage.status === 'In Progress' ? '3px solid #1A6FD4' : '0.5px solid rgba(0,0,0,0.08)'
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
          background: stage.status === 'Completed' ? '#0D9E7A' : stage.status === 'In Progress' ? '#1A6FD4' : '#E5E7EB',
          color: stage.status === 'Not Started' ? '#6B7280' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500'
        }}>
          {stage.status === 'Completed' ? '✓' : stage.sequenceOrder}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '500', fontSize: '14px', color: '#0F2847' }}>{stage.name}</span>
            <span className={`badge ${statusBadge(stage.status)}`}>{stage.status}</span>
            {stage.dueDate && (
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>📅 Due: {new Date(stage.dueDate).toLocaleDateString('en-GB')}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <div className="prog" style={{ flex: 1 }}>
              <div className="prog-fill" style={{ width: `${progress}%`, background: stage.status === 'Completed' ? '#0D9E7A' : '#1A6FD4' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#9CA3AF', minWidth: '32px' }}>{progress}%</span>
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{completedTasks}/{totalTasks} tasks</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {stage.status === 'In Progress' && canSubmitStage() && (
            <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="btn btn-blue btn-xs">Submit for review</button>
          )}
          {stage.status === 'Under Review' && canApproveGate() && (
            <>
              <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} className="btn btn-success btn-xs">Approve</button>
              <button onClick={() => requestChangesMutation.mutate()} disabled={requestChangesMutation.isPending} className="btn btn-warning btn-xs">Request changes</button>
              <button onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending} className="btn btn-danger btn-xs">Reject</button>
            </>
          )}
          {stage.status === 'Under Review' && !canApproveGate() && (
            <span className="badge badge-amber">Pending approver review</span>
          )}
          {stage.status === 'Completed' && canReopenStage() && (
            <button onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending} className="btn btn-warning btn-xs">🔄 Reopen</button>
          )}
          {canAssignStageOwner() && <StageDatePicker stage={stage} launchId={launchId} onRefresh={onRefresh} />}
          {canAssignStageOwner() && <StageOwnerPicker stage={stage} launchId={launchId} onRefresh={onRefresh} />}
          {!canAssignStageOwner() && stage.ownerId && (
            <span className="badge badge-gray" style={{ fontSize: '11px' }}>👤 Owner assigned</span>
          )}
        </div>

        {expanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
      </div>

      {expanded && (
        <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasks</span>
            {canAddTask() && (
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="btn btn-outline btn-xs"><Plus size={12} /> Add task</button>
            )}
          </div>

          {showTaskForm && (
            <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '10px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Task name..." className="form-input" style={{ flex: 1 }} />
              <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="form-input" style={{ width: 'auto' }}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
              <button onClick={() => createTaskMutation.mutate({ name: taskName, stageId: stage.id, priority: taskPriority })} className="btn btn-blue btn-sm">Add</button>
            </div>
          )}

          {stage.tasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>No tasks for this stage</div>
          ) : (
            stage.tasks?.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <input
                  type="checkbox"
                  checked={task.status === 'Completed'}
                  disabled={!canToggleTask()}
                  onChange={(e) => updateTaskMutation.mutate({ taskId: task.id, status: e.target.checked ? 'Completed' : 'In Progress' })}
                  style={{ width: '15px', height: '15px', cursor: canToggleTask() ? 'pointer' : 'not-allowed', opacity: canToggleTask() ? 1 : 0.4 }}
                />
                <span style={{ flex: 1, fontSize: '12px', color: task.status === 'Completed' ? '#9CA3AF' : '#374151', textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>{task.name}</span>
                <span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span>
                <TaskAssigneePicker task={task} launchId={launchId} onRefresh={onRefresh} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Comments Section ────────────────────────────────────────────────────────
function CommentsSection({ launchId }) {
  const [body, setBody] = useState('')
  const queryClient = useQueryClient()

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', launchId],
    queryFn: () => api.get(`/launches/${launchId}/comments`).then(r => r.data)
  })

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/launches/${launchId}/comments`, data),
    onSuccess: () => { queryClient.invalidateQueries(['comments', launchId]); setBody(''); toast.success('Comment added') },
    onError: () => toast.error('Failed to add comment')
  })

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div className="section-title" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <MessageSquare size={16} /> Comments & collaboration
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment, update or note about this launch..." rows={3} className="form-input" style={{ resize: 'vertical', flex: 1 }} />
        <button onClick={() => body.trim() && addMutation.mutate({ body })} disabled={!body.trim() || addMutation.isPending} className="btn btn-primary">
          <Send size={14} /> {addMutation.isPending ? 'Posting...' : 'Post'}
        </button>
      </div>
      {isLoading ? (
        <div className="empty-state" style={{ padding: '20px' }}>Loading comments...</div>
      ) : comments?.length === 0 ? (
        <div className="empty-state">
          <MessageSquare size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <div style={{ fontSize: '13px' }}>No comments yet</div>
        </div>
      ) : (
        comments?.map(comment => (
          <div key={comment.id} style={{ padding: '14px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '10px' }}>
            <div className="avatar">{comment.author?.fullName?.charAt(0) || 'U'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500', fontSize: '13px', color: '#0F2847' }}>{comment.author?.fullName}</span>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(comment.createdAt).toLocaleString('en-GB')}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{comment.body}</div>
              {comment.replies?.length > 0 && (
                <div style={{ marginTop: '10px', paddingLeft: '14px', borderLeft: '2px solid #EBF3FD' }}>
                  {comment.replies.map(reply => (
                    <div key={reply.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px', background: '#0D9E7A' }}>{reply.author?.fullName?.charAt(0) || 'U'}</div>
                      <div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '2px' }}>
                          <span style={{ fontWeight: '500', fontSize: '12px', color: '#0F2847' }}>{reply.author?.fullName}</span>
                          <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{new Date(reply.createdAt).toLocaleString('en-GB')}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#4B5563' }}>{reply.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Launch Detail Page ──────────────────────────────────────────────────────
export default function LaunchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({})

  const { data: launch, isLoading, refetch } = useQuery({
    queryKey: ['launch', id],
    queryFn: () => api.get(`/launches/${id}`).then(r => r.data),
    refetchInterval: 5000
  })

  if (isLoading) return <div className="empty-state" style={{ padding: '80px' }}>Loading launch details...</div>
  if (!launch) return <div className="empty-state" style={{ padding: '80px' }}>Launch not found</div>

  const completedStages = launch.stages?.filter(s => s.status === 'Completed').length || 0
  const totalStages = launch.stages?.length || 0
  const overallProgress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0

  return (
    <div>
      <button onClick={() => navigate('/launches')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#1A6FD4', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to launches
      </button>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => navigate(`/launches/${id}/gantt`)} className="btn" style={{ background: '#F0ECFB', color: '#6B4FBB' }}><BarChart2 size={14} /> Timeline</button>
        <button onClick={() => navigate(`/launches/${id}/kanban`)} className="btn btn-success"><ListTodo size={14} /> Task board</button>
        <button onClick={() => navigate(`/launches/${id}/readiness`)} className="btn btn-blue"><Activity size={14} /> Readiness</button>
        {canEditLaunch() && (
          <button onClick={() => {
            setEditForm({
              productName: launch.productName, category: launch.category || '', businessUnit: launch.businessUnit || '',
              region: launch.region || '', targetLaunchDate: launch.targetLaunchDate ? new Date(launch.targetLaunchDate).toISOString().split('T')[0] : '',
              priority: launch.priority, status: launch.status, description: launch.description || ''
            })
            setShowEdit(true)
          }} className="btn btn-outline"><Edit size={14} /> Edit</button>
        )}
      </div>

      {showEdit && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Edit launch</span>
              <button onClick={() => setShowEdit(false)} className="icon-btn"><X size={18} /></button>
            </div>
            {[{ label: 'Product name', key: 'productName' }, { label: 'Category', key: 'category' }, { label: 'Business unit', key: 'businessUnit' }, { label: 'Region', key: 'region' }].map(({ label, key }) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input className="form-input" value={editForm[key] || ''} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={editForm.priority || 'High'} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={editForm.status || 'Draft'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option>Draft</option><option>Active</option><option>Delayed</option><option>Completed</option><option>Archived</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Target launch date</label>
              <input type="date" className="form-input" value={editForm.targetLaunchDate || ''} onChange={(e) => setEditForm({ ...editForm, targetLaunchDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEdit(false)} className="btn btn-outline">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await api.patch(`/launches/${id}`, editForm)
                    queryClient.invalidateQueries(['launch', id])
                    toast.success('Launch updated successfully')
                    setShowEdit(false)
                  } catch { toast.error('Failed to update launch') }
                }}
                className="btn btn-primary"
              >Save changes</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg, #0F2847 0%, #0A1B30 100%)', borderRadius: '12px', padding: '24px 28px', marginBottom: '20px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px', letterSpacing: '0.06em' }}>{launch.productCode}</div>
            <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '500' }}>{launch.productName}</h1>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px', opacity: 0.7 }}>
              <span>📦 {launch.businessUnit || 'N/A'}</span>
              <span>🌍 {launch.region || 'N/A'}</span>
              <span>📅 Target: {launch.targetLaunchDate ? new Date(launch.targetLaunchDate).toLocaleDateString('en-GB') : 'Not set'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: '500' }}>{overallProgress}%</div>
            <div style={{ fontSize: '11px', opacity: 0.5 }}>Overall progress</div>
            <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>{completedStages}/{totalStages} stages completed</div>
          </div>
        </div>
        <div style={{ marginTop: '14px', height: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px' }}>
          <div style={{ width: `${overallProgress}%`, height: '100%', background: '#1A6FD4', borderRadius: '3px', transition: 'width 0.5s' }} />
        </div>
      </div>

      {launch.description && (
        <div className="card" style={{ marginBottom: '16px', fontSize: '13px', color: '#4B5563', lineHeight: '1.6' }}>{launch.description}</div>
      )}

      <div className="section-title" style={{ marginBottom: '10px' }}>Stage gate progress</div>
      {launch.stages?.map(stage => (
        <StageCard key={stage.id} stage={stage} launchId={id} onRefresh={refetch} />
      ))}

      <Documents launchId={id} />
      <CommentsSection launchId={id} />
    </div>
  )
}