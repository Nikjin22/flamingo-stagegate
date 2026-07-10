import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import dayjs from 'dayjs'

const categories = [
  { key: 'Regulatory',    icon: '📋', description: 'MHRA approvals, MA submission, labelling' },
  { key: 'Manufacturing', icon: '🏭', description: 'GMP compliance, batch validation, site approval' },
  { key: 'Supply Chain',  icon: '🚚', description: 'API sourcing, 3PL setup, UK distribution' },
  { key: 'Commercial',    icon: '💰', description: 'NHS listing, pricing, wholesaler agreements' },
  { key: 'Marketing',     icon: '📣', description: 'Brand materials, sales tools, communications' },
  { key: 'Training',      icon: '🎓', description: 'Sales team training, medical information readiness' },
]

const getScoreColor = (score) => score >= 80 ? '#0D9E7A' : score >= 60 ? '#D4820A' : score >= 40 ? '#E0622E' : '#C8362E'
const getScoreLabel = (score) => score >= 80 ? 'Ready' : score >= 60 ? 'On track' : score >= 40 ? 'At risk' : 'Not ready'
const TREND_COLORS = ['#1A6FD4', '#0D9E7A', '#D4820A', '#C8362E', '#6B4FBB', '#0891B2']

export default function Readiness() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scores, setScores] = useState({})
  const [activeTab, setActiveTab] = useState('assessment')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['readiness', id],
    queryFn: () => api.get(`/launches/${id}/readiness`).then(r => r.data),
    refetchInterval: 8000,
    onSuccess: (data) => {
      const initial = {}
      data.categoryScores.forEach(c => { initial[c.category] = c.score })
      setScores(initial)
    }
  })

  const { data: launch } = useQuery({
    queryKey: ['launch', id],
    queryFn: () => api.get(`/launches/${id}`).then(r => r.data)
  })

  const saveMutation = useMutation({
    mutationFn: () => api.post(`/launches/${id}/readiness/bulk`, {
      scores: Object.entries(scores).map(([category, score]) => ({ category, score }))
    }),
    onSuccess: () => { toast.success('Readiness scores saved successfully'); refetch(); queryClient.invalidateQueries(['readiness', id]) },
    onError: () => toast.error('Failed to save scores')
  })

  const radarData = categories.map(cat => ({
    category: cat.key,
    score: scores[cat.key] !== undefined ? scores[cat.key] : data?.categoryScores?.find(c => c.category === cat.key)?.score || 0
  }))

  const overallScore = radarData.length > 0 ? Math.round(radarData.reduce((sum, c) => sum + c.score, 0) / radarData.length) : 0

  const trendData = (() => {
    if (!data?.assessments || data.assessments.length === 0) return []
    const sessions = []
    const sorted = [...data.assessments].sort((a, b) => new Date(a.assessedAt) - new Date(b.assessedAt))
    let currentSession = null
    let sessionTime = null
    sorted.forEach(a => {
      const assessedTime = new Date(a.assessedAt)
      if (!sessionTime || assessedTime - sessionTime > 5 * 60 * 1000) {
        currentSession = { date: dayjs(a.assessedAt).format('DD MMM HH:mm') }
        sessions.push(currentSession)
        sessionTime = assessedTime
      }
      currentSession[a.category] = a.score
    })
    return sessions.slice(-10)
  })()

  if (isLoading) return <div className="empty-state" style={{ padding: '80px' }}>Loading readiness data...</div>

  return (
    <div>
      <button onClick={() => navigate(`/launches/${id}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#1A6FD4', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to launch
      </button>

      <div style={{ background: 'linear-gradient(135deg, #0F2847 0%, #0A1B30 100%)', borderRadius: '12px', padding: '24px 28px', marginBottom: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px', letterSpacing: '0.06em' }}>LAUNCH READINESS ASSESSMENT</div>
          <h1 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '500' }}>{launch?.productName}</h1>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>{launch?.productCode}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '84px', height: '84px', borderRadius: '50%',
            background: `conic-gradient(${getScoreColor(overallScore)} ${overallScore * 3.6}deg, rgba(255,255,255,0.15) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: '66px', height: '66px', borderRadius: '50%', background: '#0F2847', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '500' }}>{overallScore}</div>
              <div style={{ fontSize: '9px', opacity: 0.6 }}>/ 100</div>
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500', color: getScoreColor(overallScore) }}>{getScoreLabel(overallScore)}</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '18px' }}>
        {[{ key: 'assessment', label: '📊 Assessment' }, { key: 'trend', label: '📈 Trend analysis' }, { key: 'history', label: '🕐 History' }].map(tab => (
          <div key={tab.key} className={`tab-item ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>{tab.label}</div>
        ))}
      </div>

      {activeTab === 'assessment' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: '18px' }}>Category scores</div>
            {categories.map(cat => {
              const currentScore = scores[cat.key] !== undefined ? scores[cat.key] : data?.categoryScores?.find(c => c.category === cat.key)?.score || 0
              return (
                <div key={cat.key} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{cat.key}</div>
                        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{cat.description}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: getScoreColor(currentScore) }}>{currentScore}%</span>
                      <span className="badge" style={{ background: getScoreColor(currentScore) + '18', color: getScoreColor(currentScore) }}>{getScoreLabel(currentScore)}</span>
                    </div>
                  </div>
                  <input type="range" min="0" max="100" value={currentScore} onChange={(e) => setScores({ ...scores, [cat.key]: parseInt(e.target.value) })} style={{ width: '100%', accentColor: getScoreColor(currentScore) }} />
                </div>
              )
            })}
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}>
              <Save size={15} /> {saveMutation.isPending ? 'Saving...' : 'Save readiness scores'}
            </button>
          </div>

          <div>
            <div className="card" style={{ marginBottom: '14px' }}>
              <div className="section-title" style={{ marginBottom: '14px' }}>Readiness radar</div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#F3F4F6" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                  <Radar name="Readiness" dataKey="score" stroke="#1A6FD4" fill="#1A6FD4" fillOpacity={0.25} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '0.5px solid rgba(0,0,0,0.08)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {categories.map(cat => {
                const score = scores[cat.key] !== undefined ? scores[cat.key] : data?.categoryScores?.find(c => c.category === cat.key)?.score || 0
                return (
                  <div key={cat.key} className="card" style={{ padding: '12px', borderLeft: `3px solid ${getScoreColor(score)}` }}>
                    <div style={{ fontSize: '15px', marginBottom: '4px' }}>{cat.icon}</div>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#374151' }}>{cat.key}</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: getScoreColor(score), marginTop: '2px' }}>{score}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trend' && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: '18px' }}>Readiness score trends over time</div>
          {trendData.length < 2 ? (
            <div className="empty-state" style={{ padding: '60px' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📈</div>
              <div className="empty-state-title">Not enough data yet</div>
              <div className="empty-state-desc">Save readiness scores multiple times to see trends</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '0.5px solid rgba(0,0,0,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {categories.map((cat, i) => (
                  <Line key={cat.key} type="monotone" dataKey={cat.key} stroke={TREND_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {!data?.assessments || data.assessments.length === 0 ? (
            <div className="empty-state">No assessment history yet</div>
          ) : (
            <table className="data-table">
              <thead><tr>{['Date', 'Category', 'Score', 'Status', 'Assessed by'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.assessments.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: '#6B7280' }}>{dayjs(a.assessedAt).format('DD/MM/YYYY HH:mm')}</td>
                    <td style={{ fontWeight: '500', color: '#0F2847' }}>{a.category}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="prog" style={{ width: '60px' }}><div className="prog-fill" style={{ width: `${a.score}%`, background: getScoreColor(a.score) }} /></div>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: getScoreColor(a.score) }}>{a.score}%</span>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: getScoreColor(a.score) + '18', color: getScoreColor(a.score) }}>{getScoreLabel(a.score)}</span></td>
                    <td style={{ color: '#6B7280' }}>{a.assessor?.fullName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}