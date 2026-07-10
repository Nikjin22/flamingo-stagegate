import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { ArrowLeft } from 'lucide-react'
import dayjs from 'dayjs'

const stageStyle = (status) => {
  if (status === 'Completed') return { dot: '#0D9E7A', dotBg: '#E6F7F2', pct: 'badge-teal' }
  if (status === 'In Progress') return { dot: '#1A6FD4', dotBg: '#EBF3FD', pct: 'badge-blue' }
  if (status === 'Under Review') return { dot: '#D4820A', dotBg: '#FEF4E4', pct: 'badge-amber' }
  if (status === 'Blocked') return { dot: '#C8362E', dotBg: '#FDECEA', pct: 'badge-red' }
  return { dot: '#9CA3AF', dotBg: '#F3F4F6', pct: 'badge-gray' }
}

export default function Gantt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedStageId, setSelectedStageId] = useState(null)

  const { data: launch, isLoading } = useQuery({
    queryKey: ['launch', id],
    queryFn: () => api.get(`/launches/${id}`).then(r => r.data),
    refetchInterval: 5000
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data)
  })

  if (isLoading) return <div className="empty-state" style={{ padding: '80px' }}>Loading timeline...</div>

  const stages = launch?.stages || []
  const selectedStage = stages.find(s => s.id === selectedStageId) || stages.find(s => s.status === 'In Progress') || stages[0]
  const owner = users?.find(u => u.id === selectedStage?.ownerId)
  const completedTasks = selectedStage?.tasks?.filter(t => t.status === 'Completed').length || 0
  const totalTasks = selectedStage?.tasks?.length || 0

  return (
    <div>
      <button onClick={() => navigate(`/launches/${id}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#1A6FD4', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to launch
      </button>

      <div style={{ marginBottom: '24px' }}>
        <div className="page-title">{launch?.productName}</div>
        <div className="page-subtitle">{launch?.productCode} · target launch {launch?.targetLaunchDate ? dayjs(launch.targetLaunchDate).format('DD MMM YYYY') : 'not set'}</div>
      </div>

      {/* Journey strip */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '28px', overflowX: 'auto', paddingBottom: '8px' }}>
        {stages.map((stage, i) => {
          const style = stageStyle(stage.status)
          const isSelected = selectedStage?.id === stage.id
          return (
            <div key={stage.id} onClick={() => setSelectedStageId(stage.id)} style={{ flex: 1, minWidth: '120px', position: 'relative', textAlign: 'center', padding: '0 6px', cursor: 'pointer' }}>
              {i > 0 && (
                <div style={{ position: 'absolute', top: '17px', left: '-50%', width: '100%', height: '2px', background: stage.status === 'Not Started' ? 'rgba(0,0,0,0.08)' : style.dot, zIndex: 0 }} />
              )}
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', margin: '0 auto 8px', position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500',
                background: style.dotBg, color: style.dot,
                border: isSelected ? `2px solid ${style.dot}` : 'none',
                boxShadow: isSelected ? `0 0 0 3px ${style.dotBg}` : 'none'
              }}>
                {stage.status === 'Completed' ? '✓' : stage.sequenceOrder}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#0F2847', marginBottom: '2px' }}>{stage.name}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                {stage.status === 'Completed' ? 'Completed' : stage.status === 'Not Started' ? 'Not started' : stage.dueDate ? `Due ${dayjs(stage.dueDate).format('DD MMM')}` : 'In progress'}
              </div>
              <span className={`badge ${style.pct}`} style={{ marginTop: '4px' }}>{stage.completionPct}%</span>
            </div>
          )
        })}
      </div>

      {/* Detail card for selected stage */}
      {selectedStage && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#0F2847' }}>
              {selectedStage.name} — {selectedStage.status.toLowerCase()}
            </div>
            <button onClick={() => navigate(`/launches/${id}`)} className="btn btn-outline btn-xs">Open in stage gate</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', width: '110px', flexShrink: 0 }}>Owner</div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847' }}>
              {owner ? owner.fullName : <span style={{ color: '#D1D5DB', fontWeight: '400' }}>Unassigned</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', width: '110px', flexShrink: 0 }}>Due date</div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F2847' }}>
              {selectedStage.dueDate ? (
                <>{dayjs(selectedStage.dueDate).format('DD MMM YYYY')} · {dayjs(selectedStage.dueDate).diff(dayjs(), 'day') >= 0 ? `in ${dayjs(selectedStage.dueDate).diff(dayjs(), 'day')} days` : `${Math.abs(dayjs(selectedStage.dueDate).diff(dayjs(), 'day'))} days overdue`}</>
              ) : <span style={{ color: '#D1D5DB', fontWeight: '400' }}>No due date set</span>}
            </div>
          </div>

          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Tasks ({completedTasks}/{totalTasks} complete)</div>
            {totalTasks === 0 ? (
              <div style={{ fontSize: '12px', color: '#D1D5DB' }}>No tasks added yet</div>
            ) : (
              selectedStage.tasks.map(task => {
                const assignee = users?.find(u => u.id === task.assigneeId)
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: task.status === 'Completed' ? '#0D9E7A' : '#1A6FD4' }} />
                    <span style={{ fontSize: '12px', flex: 1, color: task.status === 'Completed' ? '#9CA3AF' : '#374151', textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>{task.name}</span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{assignee ? assignee.fullName : 'Unassigned'}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '20px' }}>
        {[
          { label: 'Total stages', value: stages.length, color: '#1A6FD4' },
          { label: 'Completed', value: stages.filter(s => s.status === 'Completed').length, color: '#0D9E7A' },
          { label: 'In progress', value: stages.filter(s => s.status === 'In Progress').length, color: '#1A6FD4' },
          { label: 'Not started', value: stages.filter(s => s.status === 'Not Started').length, color: '#9CA3AF' },
        ].map(card => (
          <div key={card.label} className="stat-card" style={{ borderLeft: `3px solid ${card.color}` }}>
            <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}