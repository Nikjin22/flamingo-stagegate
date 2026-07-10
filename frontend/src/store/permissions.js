import useAuthStore from './authStore'

// Returns true if the logged-in user has at least one of the given roles
export const hasRole = (...allowedRoles) => {
  const user = useAuthStore.getState().user
  if (!user || !user.roles) return false
  return user.roles.some(r => allowedRoles.includes(r))
}

// Convenience checks used across the app
export const canDeleteLaunch   = () => hasRole('Admin')
export const canArchiveLaunch  = () => hasRole('Admin', 'Launch Manager')
export const canApproveGate    = () => hasRole('Admin', 'Approver')
export const canReopenStage    = () => hasRole('Admin', 'Launch Manager')
export const canAssignStageOwner = () => hasRole('Admin', 'Launch Manager')
// Anyone who can actively change launch data (not pure viewers)
export const canEditLaunchData = () => hasRole('Admin', 'Launch Manager', 'Approver', 'Team Member')
export const canSubmitStage = () => hasRole('Admin', 'Launch Manager', 'Team Member')
export const canAddTask = () => hasRole('Admin', 'Launch Manager', 'Team Member')
export const canEditLaunch = () => hasRole('Admin', 'Launch Manager')
export const canToggleTask = () => hasRole('Admin', 'Launch Manager', 'Approver', 'Team Member')
export const canViewAuditTrail = () => hasRole('Admin')
export const canManageUsers    = () => hasRole('Admin')
export const canManageRoles    = () => hasRole('Admin')