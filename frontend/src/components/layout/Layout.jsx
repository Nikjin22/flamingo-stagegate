import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Rocket, LogOut,
  Bell, Menu, X, BarChart2, Users,
  CheckCheck, Clock, Shield, Settings,
  ChevronRight, LayoutGrid
} from 'lucide-react'
import logo from '../../assets/logo.png'
import { canViewAuditTrail } from '../../store/permissions'
import dayjs from 'dayjs'

const getNavSections = () => {
  const sections = [
    {
      label: 'Main',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/launches',  label: 'Launches',  icon: Rocket },
      ]
    },
  ]

  if (canViewAuditTrail()) {
    sections.push({
      label: 'Analytics',
      items: [
        { path: '/audit', label: 'Audit trail', icon: Shield },
      ]
    })
  }

  sections.push({
    label: 'Admin',
    items: [
      { path: '/users', label: 'Users', icon: Users },
    ]
  })

  return sections
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1280)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1100) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: unreadData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30000
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    enabled: notifOpen
  })

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      queryClient.invalidateQueries(['notif-count'])
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      queryClient.invalidateQueries(['notif-count'])
      toast.success('All notifications marked as read')
    }
  })

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const unreadCount = unreadData?.count || 0

  const notifTypeIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED': return '📋'
      case 'TASK_OVERDUE': return '⚠️'
      case 'GATE_PENDING': return '🔔'
      case 'CHANGES_REQUESTED': return '✏️'
      case 'STAGE_DUE': return '📅'
      default: return '💬'
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F4F6FA' }}>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '224px' : '64px',
        background: 'linear-gradient(180deg, #0F2847 0%, #0A1B30 100%)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease',
        overflow: 'hidden', flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <div style={{
            width: sidebarOpen ? '120px' : '36px',
            height: sidebarOpen ? '40px' : '36px',
            background: 'white',
            borderRadius: sidebarOpen ? '8px' : '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: sidebarOpen ? '4px' : '2px', overflow: 'hidden',
            transition: 'all 0.2s ease'
          }}>
            <img src={logo} alt="Flamingo Pharma" style={{
              width: '100%', height: '100%',
              objectFit: sidebarOpen ? 'contain' : 'cover',
              objectPosition: sidebarOpen ? 'center' : 'left center'
            }} />
          </div>
          {sidebarOpen && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>Stage Gate System</div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {getNavSections().map(section => (
            <div key={section.label}>
              {sidebarOpen && (
                <div style={{
                  fontSize: '9px', color: 'rgba(255,255,255,0.3)',
                  padding: '12px 10px 5px', letterSpacing: '0.08em',
                  textTransform: 'uppercase', fontWeight: '500'
                }}>
                  {section.label}
                </div>
              )}
              {section.items.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '7px', marginBottom: '2px',
                    textDecoration: 'none',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                    background: isActive ? 'rgba(26,111,212,0.25)' : 'transparent',
                    borderLeft: isActive ? '2px solid #1A6FD4' : '2px solid transparent',
                    transition: 'all 0.15s', fontSize: '13px'
                  })}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {sidebarOpen && <span style={{ fontWeight: '500' }}>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {sidebarOpen && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '8px 10px', marginBottom: '4px'
            }}>
              <div style={{
                width: '28px', height: '28px',
                background: '#1A6FD4', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '11px', fontWeight: '500', flexShrink: 0
              }}>
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: '500' }}>{user?.fullName}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{user?.roles?.[0] || 'User'}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: '7px',
              border: 'none', background: 'transparent',
              color: 'rgba(255,255,255,0.55)', cursor: 'pointer', width: '100%', fontSize: '13px'
            }}
          >
            <LogOut size={17} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          background: 'white', padding: '0 20px', height: '50px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="icon-btn"
          >
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Bell with badge */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="icon-btn"
                style={{ background: notifOpen ? '#EBF3FD' : 'transparent', position: 'relative' }}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="notif-dot" />
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: '40px', right: 0,
                  width: '360px', background: 'white',
                  borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                  border: '0.5px solid rgba(0,0,0,0.08)', zIndex: 1000, overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#FAFBFC'
                  }}>
                    <span style={{ fontWeight: '500', fontSize: '13px', color: '#0F2847' }}>
                      Notifications
                      {unreadCount > 0 && (
                        <span className="badge badge-red" style={{ marginLeft: '8px' }}>{unreadCount} new</span>
                      )}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#1A6FD4', fontSize: '11px', fontWeight: '500'
                        }}
                      >
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {!notifications || notifications.length === 0 ? (
                      <div className="empty-state" style={{ padding: '32px 16px' }}>
                        <Bell size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                        <div style={{ fontSize: '13px' }}>No notifications yet</div>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
                          style={{
                            padding: '11px 16px',
                            borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                            background: notif.isRead ? 'white' : '#F8FAFF',
                            cursor: notif.isRead ? 'default' : 'pointer',
                            display: 'flex', gap: '10px', alignItems: 'flex-start'
                          }}
                        >
                          <span style={{ fontSize: '18px', flexShrink: 0 }}>{notifTypeIcon(notif.type)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: notif.isRead ? '400' : '500', color: '#0F2847' }}>
                              {notif.title}
                            </div>
                            {notif.body && (
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', lineHeight: '1.4' }}>{notif.body}</div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '10px', color: '#9CA3AF' }}>
                              <Clock size={9} />
                              {new Date(notif.createdAt).toLocaleString('en-GB')}
                            </div>
                          </div>
                          {!notif.isRead && (
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1A6FD4', flexShrink: 0, marginTop: '4px' }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div ref={profileRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setProfileOpen(!profileOpen)}
                className="avatar"
                style={{ width: '30px', height: '30px', fontSize: '11px', cursor: 'pointer' }}
              >
                {user?.fullName?.charAt(0) || 'U'}
              </div>

              {profileOpen && (
                <div style={{
                  position: 'absolute', top: '40px', right: 0,
                  width: '260px', background: 'white',
                  borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                  border: '0.5px solid rgba(0,0,0,0.08)', zIndex: 1000, overflow: 'hidden'
                }}>
                  <div style={{ padding: '18px 16px', background: '#FAFBFC', borderBottom: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
                    <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '18px', margin: '0 auto 10px' }}>
                      {user?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#0F2847' }}>{user?.fullName}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{user?.email}</div>
                  </div>

                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                      <span style={{ color: '#9CA3AF' }}>Role</span>
                      <span style={{ fontWeight: '500', color: '#374151' }}>{user?.roles?.join(', ') || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                      <span style={{ color: '#9CA3AF' }}>Department</span>
                      <span style={{ fontWeight: '500', color: '#374151' }}>Flamingo Pharma UK</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                      <span style={{ color: '#9CA3AF' }}>Last login</span>
                      <span style={{ fontWeight: '500', color: '#374151' }}>
                        {user?.lastLogin ? dayjs(user.lastLogin).format('DD MMM YYYY, HH:mm') : 'This session'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                      <span style={{ color: '#9CA3AF' }}>Member since</span>
                      <span style={{ fontWeight: '500', color: '#374151' }}>
                        {user?.createdAt ? dayjs(user.createdAt).format('DD MMM YYYY') : '—'}
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: '8px' }}>
                    <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      <LogOut size={13} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="page-enter" style={{ flex: 1, overflow: 'auto', padding: window.innerWidth < 1100 ? '14px' : '20px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}