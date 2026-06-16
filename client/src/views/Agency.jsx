import { useState } from 'react'
import { shallow } from 'zustand/shallow'
import { motion } from 'framer-motion'
import { Plus, Download, Trash2, Instagram, Youtube, Twitter, BarChart3, TrendingUp, AlertTriangle, Clock, Columns, List } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAgencyStore, useAgencyClients, useAgencyProspects, useAgencyRevenue, useAgencyOutreach, useAgencyContent, useAgencyGBP, useUpdateProspect, useDeleteProspect, useClientHealth } from '../store/agencyStore'
import { useThemeStore } from '../store/themeStore'
import { useConfirm } from '../hooks/useConfirm'
import ClientCard from '../components/ClientCard'
import PipelineKanban from '../components/PipelineKanban'
import { prospectStatuses } from '../utils/formatters'
import Modal from '../components/Modal'
import DataError from '../components/DataError'
import { CardSkeleton, SummaryCardSkeleton, ChartSkeleton } from '../components/Skeleton'

export default function Agency() {
  const isDark = useThemeStore(s => s.theme === 'dark' || s.theme === 'monk' || s.theme === 'night')
  const {
    clients,
    prospects,
    revenues,
    outreach,
    content,
    gbp,
    addProspect,
    deleteProspect,
    logOutreach,
    addContent,
    deleteContent,
    addGBP
   } = useAgencyStore(
    s => ({
      clients: s.clients,
      prospects: s.prospects,
      revenues: s.revenues,
      outreach: s.outreach,
      content: s.content,
      gbp: s.gbp,
      addProspect: s.addProspect,
      deleteProspect: s.deleteProspect,
      logOutreach: s.logOutreach,
      addContent: s.addContent,
      deleteContent: s.deleteContent,
      addGBP: s.addGBP
    }),
    shallow
  )

  // Populate store data via React Query hooks
  const { isLoading: clientsLoading, isError: clientsError, refetch: refetchClients } = useAgencyClients()
  const { isLoading: prospectsLoading, isError: prospectsError, refetch: refetchProspects } = useAgencyProspects()
  const { isLoading: revenueLoading, isError: revenueError, refetch: refetchRevenue } = useAgencyRevenue()
  const { isLoading: outreachLoading, isError: outreachError, refetch: refetchOutreach } = useAgencyOutreach()
  const { isLoading: contentLoading, isError: contentError, refetch: refetchContent } = useAgencyContent()
  const { isLoading: gbpLoading, isError: gbpError, refetch: refetchGBP } = useAgencyGBP()
  const { data: healthScores = [] } = useClientHealth()

  const isLoading = clientsLoading || prospectsLoading || revenueLoading || outreachLoading || contentLoading || gbpLoading
  const isError = clientsError || prospectsError || revenueError || outreachError || contentError || gbpError
  const refetchAll = () => {
    refetchClients()
    refetchProspects()
    refetchRevenue()
    refetchOutreach()
    refetchContent()
    refetchGBP()
  }

  const [showProspectModal, setShowProspectModal] = useState(false)
  const [newProspect, setNewProspect] = useState({ company_name: '', contact_name: '', phone: '', state: '', status: 'new_lead', notes: '', next_action: '' })
  const [outreachForm, setOutreachForm] = useState({ calls_made: 0, dms_sent: 0, responses: 0, meetings_booked: 0, notes: '' })
  const [showContentModal, setShowContentModal] = useState(false)
  const [newContent, setNewContent] = useState({ date: new Date().toISOString().split('T')[0], platform: 'instagram', content_type: 'post', client: '', caption: '', likes: 0, comments: 0, shares: 0, views: 0, link: '' })
  const [showGBPModal, setShowGBPModal] = useState(false)
  const [newGBP, setNewGBP] = useState({ week_start: '', profile_views: 0, direction_requests: 0, phone_calls: 0, new_reviews: 0, avg_rating: 5.0, posts_published: 0 })
  const [pipelineView, setPipelineView] = useState('kanban')

  const deleteMutation = useDeleteProspect()
  const updateProspectMutation = useUpdateProspect()

  const totalRevenue = Array.isArray(revenues) ? revenues.reduce((s, r) => s + (r.revenue_mad || 0), 0) : 0
  const totalExpenses = Array.isArray(revenues) ? revenues.reduce((s, r) => s + (r.expenses_mad || 0), 0) : 0
  const totalProfit = totalRevenue - totalExpenses
  const revenueGoal = 10000
  const goalProgress = totalRevenue > 0 ? Math.min((totalRevenue / revenueGoal) * 100, 100) : 0

  const cdzClient = Array.isArray(clients) ? clients.find(c => c.name?.includes('CDZ')) : null
  const contractDaysLeft = cdzClient ? Math.max(0, Math.floor((new Date(cdzClient.contract_end) - Date.now()) / 86400000)) : 0
  const contractUrgent = contractDaysLeft > 0 && contractDaysLeft <= 7

  const { confirm, ConfirmModal } = useConfirm()

  async function handleDeleteProspect(id) {
    if (await confirm('Delete this prospect? This cannot be undone.', { title: 'Delete Prospect' })) {
      deleteProspect(id)
    }
  }

  function handleStatusChange(id, newStatus) {
    updateProspectMutation.mutate({ id, updates: { status: newStatus } })
    useAgencyStore.setState(state => ({
      prospects: state.prospects.map(p => p.id === id ? { ...p, status: newStatus } : p)
    }))
  }

  function handleAddProspect(e) {
    e.preventDefault()
    addProspect(newProspect)
    setShowProspectModal(false)
    setNewProspect({ company_name: '', contact_name: '', phone: '', state: '', status: 'new_lead', notes: '', next_action: '' })
  }

  function handleOutreachSubmit(date) {
    logOutreach({ date, ...outreachForm })
    setOutreachForm({ calls_made: 0, dms_sent: 0, responses: 0, meetings_booked: 0, notes: '' })
  }

  const outreachChartData = Array.isArray(outreach) ? outreach.slice().reverse().slice(-7).map(o => ({
    date: o.date?.slice(5) || o.date,
    Calls: o.calls_made || 0,
    DMs: o.dms_sent || 0,
  })) : []

  const axisColor = isDark ? '#636366' : '#6E6E73'
  const revenueColor = isDark ? '#818CF8' : '#5B5BD6'
  const gbpColor = isDark ? '#30D158' : '#34C759'
  const tooltipBg = isDark ? '#2C2C2E' : '#FFFFFF'

  const revenueChartData = Array.isArray(revenues) ? revenues.slice().reverse().map(r => ({
    month: r.month,
    Revenue: r.revenue_mad || 0,
  })) : []

  function exportCSV() {
    const headers = ['Company Name', 'Contact Name', 'Phone', 'State', 'Status', 'Last Contact', 'Notes', 'Next Action']
    const rows = prospects.map(p => [p.company_name, p.contact_name, p.phone, p.state, p.status, p.last_contact, p.notes, p.next_action])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'prospects.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="p-8 max-w-6xl mx-auto space-y-6">
      {isLoading && (
        <div className="space-y-6">
          <SummaryCardSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardSkeleton rows={4} />
            <CardSkeleton rows={4} />
          </div>
        </div>
      )}
      {isError && <DataError message="Failed to load agency data" onRetry={refetchAll} />}
      {/* Agency Header */}
      <div className="flex items-center gap-4 stack-on-mobile">
        <img src="/images/agency/logo.png" alt="MIX AGENCI" className="h-8 object-contain"
          onError={e => { e.target.style.display='none'; document.getElementById('agency-title').style.display='block' }} />
        <h1 id="agency-title" className="text-heading font-semibold hidden">MIX AGENCI</h1>
        <div>
          <p className="text-body text-apple-muted">Founder</p>
          <p className="text-small text-apple-muted">Focus: HVAC Social Media Marketing</p>
        </div>
      </div>

      {/* War Board Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-apple-blue" />
            <span className="text-micro text-apple-muted font-medium uppercase tracking-wider">Revenue</span>
          </div>
          <div className="text-heading font-bold">{totalRevenue.toLocaleString()} MAD</div>
          <div className="mt-1">
            <div className="flex justify-between text-micro text-apple-muted mb-0.5">
              <span>Goal: {revenueGoal.toLocaleString()} MAD</span>
              <span>{goalProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-apple-surface rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${goalProgress}%` }} className="h-full bg-apple-blue rounded-full" />
            </div>
          </div>
          <div className="text-micro text-apple-tertiary mt-1">
            {totalRevenue >= revenueGoal ? 'Goal reached!' : `${(revenueGoal - totalRevenue).toLocaleString()} MAD to $10K`}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }} className={`card ${contractUrgent ? 'ring-2 ring-apple-red/50' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className={contractUrgent ? 'text-apple-red' : 'text-apple-green'} />
            <span className="text-micro text-apple-muted font-medium uppercase tracking-wider">Contract</span>
          </div>
          {cdzClient ? (
            <>
              <div className="flex items-center gap-2">
                <span className={`text-heading font-bold ${contractUrgent ? 'text-apple-red' : ''}`}>{contractDaysLeft}</span>
                <span className="text-body text-apple-muted">days left</span>
                {contractUrgent && <AlertTriangle size={16} className="text-apple-red animate-pulse" />}
              </div>
              <div className="text-small text-apple-muted truncate mt-0.5">{cdzClient.name}</div>
              <div className="text-micro text-apple-tertiary">Ends {cdzClient.contract_end}</div>
            </>
          ) : (
            <div className="text-body text-apple-muted">No active contract</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className="card">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-apple-amber" />
            <span className="text-micro text-apple-muted font-medium uppercase tracking-wider">Pipeline</span>
          </div>
          <div className="text-heading font-bold">{prospects.length}</div>
          <div className="text-body text-apple-muted">active prospects</div>
          <div className="text-micro text-apple-tertiary mt-0.5">
            {prospects.filter(p => p.status !== 'closed_won' && p.status !== 'closed_lost').length} in play
            · {prospects.filter(p => p.status === 'meeting_booked' || p.status === 'proposal_sent').length} hot
          </div>
        </motion.div>
      </div>

      {/* Active Client */}
      <div>
        <div className="section-label mb-3">Active Client</div>
        {clients.length > 0 ? (
          <div className="space-y-3">
            {clients.map(c => {
              const h = healthScores.find(s => s.id === c.id)
              const healthColor = !h ? '' : h.label === 'Good' ? 'bg-apple-green' : h.label === 'Okay' ? 'bg-apple-amber' : 'bg-apple-red'
              return (
                <div key={c.id} className="flex items-center gap-3 stack-on-mobile">
                  <div className="flex-1"><ClientCard client={c} /></div>
                  {h && (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${healthColor}`} />
                      <span className="text-small font-medium">{h.health_score}</span>
                      <span className={`text-micro ${h.label === 'Good' ? 'text-apple-green' : h.label === 'Okay' ? 'text-apple-amber' : 'text-apple-red'}`}>
                        {h.label}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-body text-apple-muted">No active clients</p>
        )}
      </div>

      {/* HVAC Pipeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">HVAC Pipeline</div>
          <div className="flex gap-2 stack-on-mobile">
            <button onClick={() => setPipelineView(p => p === 'kanban' ? 'table' : 'kanban')}
              className="btn-ghost flex items-center gap-1 text-small">
              {pipelineView === 'kanban' ? <List size={14} /> : <Columns size={14} />}
              {pipelineView === 'kanban' ? 'Table' : 'Kanban'}
            </button>
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-1 text-small"><Download size={14} /> CSV</button>
            <button onClick={() => setShowProspectModal(true)} className="btn-primary flex items-center gap-1 text-small"><Plus size={14} /> Add Prospect</button>
          </div>
        </div>

        {pipelineView === 'kanban' ? (
          <div className="card p-3 overflow-x-auto">
            <PipelineKanban prospects={prospects} onDelete={handleDeleteProspect} onStatusChange={handleStatusChange} isDark={isDark} />
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-apple-border">
                  <th className="text-left p-2 text-apple-muted font-medium">Company</th>
                  <th className="text-left p-2 text-apple-muted font-medium">Contact</th>
                  <th className="text-left p-2 text-apple-muted font-medium">Phone</th>
                  <th className="text-left p-2 text-apple-muted font-medium">State</th>
                  <th className="text-left p-2 text-apple-muted font-medium">Status</th>
                  <th className="text-left p-2 text-apple-muted font-medium">Next Action</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {prospects.length === 0 && (
                  <tr><td colSpan="7" className="text-center py-8 text-apple-muted">No prospects yet. Add your first one.</td></tr>
                )}
                {prospects.map(p => {
                  const statusConfig = prospectStatuses.find(s => s.value === p.status) || prospectStatuses[0]
                  return (
                    <tr key={p.id} className="border-b border-apple-border/50 hover:bg-apple-surface transition-colors">
                      <td className="p-2 font-medium">{p.company_name || '—'}</td>
                      <td className="p-2 text-apple-muted">{p.contact_name || '—'}</td>
                      <td className="p-2 text-apple-muted">{p.phone || '—'}</td>
                      <td className="p-2 text-apple-muted">{p.state || '—'}</td>
                      <td className="p-2"><span className={statusConfig.color}>{statusConfig.label}</span></td>
                      <td className="p-2 text-apple-muted">{p.next_action || '—'}</td>
                      <td className="p-2">
                        <button onClick={() => handleDeleteProspect(p.id)} aria-label="Delete prospect" className="text-apple-tertiary hover:text-apple-red transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue Tracker */}
      <div>
        <div className="section-label mb-3">Revenue Tracker</div>
        <div className="card">
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-apple-border">
                  <th className="text-left p-2 text-apple-muted font-medium">Month</th>
                  <th className="text-right p-2 text-apple-muted font-medium">Revenue (MAD)</th>
                  <th className="text-right p-2 text-apple-muted font-medium">Expenses (MAD)</th>
                  <th className="text-right p-2 text-apple-muted font-medium">Profit (MAD)</th>
                </tr>
              </thead>
              <tbody>
                {revenues.map(r => (
                  <tr key={r.id} className="border-b border-apple-border/50">
                    <td className="p-2 font-medium">{r.month} {r.year}</td>
                    <td className="p-2 text-right">{r.revenue_mad?.toLocaleString() || 0}</td>
                    <td className="p-2 text-right">{r.expenses_mad?.toLocaleString() || 0}</td>
                    <td className="p-2 text-right font-medium text-apple-green">
                      {((r.revenue_mad || 0) - (r.expenses_mad || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-right">{totalRevenue.toLocaleString()}</td>
                  <td className="p-2 text-right">{totalExpenses.toLocaleString()}</td>
                  <td className="p-2 text-right text-apple-green">{totalProfit.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Goal Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-small text-apple-muted mb-1">
              <span>Goal: {revenueGoal.toLocaleString()} MAD/month</span>
              <span>{goalProgress.toFixed(0)}% to goal</span>
            </div>
            <div className="h-3 bg-apple-surface rounded-full overflow-hidden">
              <div className="h-full bg-apple-blue rounded-full transition-all" style={{ width: `${goalProgress}%` }} />
            </div>
          </div>

          {/* Revenue Chart */}
          {revenueChartData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: tooltipBg, border: 'none', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                  <Bar dataKey="Revenue" fill={revenueColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Outreach Log */}
      <div>
        <div className="section-label mb-3">Outreach Log</div>
        <div className="card">
          <form onSubmit={(e) => { e.preventDefault(); handleOutreachSubmit(new Date().toISOString().split('T')[0]) }} className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Calls</label>
              <input type="number" value={outreachForm.calls_made} onChange={e => setOutreachForm(p => ({ ...p, calls_made: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">DMs</label>
              <input type="number" value={outreachForm.dms_sent} onChange={e => setOutreachForm(p => ({ ...p, dms_sent: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Responses</label>
              <input type="number" value={outreachForm.responses} onChange={e => setOutreachForm(p => ({ ...p, responses: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Booked</label>
              <input type="number" value={outreachForm.meetings_booked} onChange={e => setOutreachForm(p => ({ ...p, meetings_booked: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full text-small">Log</button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-apple-border">
                  <th className="text-left p-2 text-apple-muted font-medium">Date</th>
                  <th className="text-right p-2 text-apple-muted font-medium">Calls</th>
                  <th className="text-right p-2 text-apple-muted font-medium">DMs</th>
                  <th className="text-right p-2 text-apple-muted font-medium">Responses</th>
                  <th className="text-right p-2 text-apple-muted font-medium">Booked</th>
                  <th className="text-left p-2 text-apple-muted font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {outreach.length === 0 && (
                  <tr><td colSpan="6" className="text-center py-4 text-apple-muted">No outreach logged yet</td></tr>
                )}
                {outreach.slice(0, 10).map(o => (
                  <tr key={o.id} className="border-b border-apple-border/50">
                    <td className="p-2">{o.date}</td>
                    <td className="p-2 text-right">{o.calls_made || 0}</td>
                    <td className="p-2 text-right">{o.dms_sent || 0}</td>
                    <td className="p-2 text-right">{o.responses || 0}</td>
                    <td className="p-2 text-right">{o.meetings_booked || 0}</td>
                    <td className="p-2 text-apple-muted max-w-[150px] truncate">{o.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Outreach Chart */}
          {outreachChartData.length > 0 && (
            <div className="h-48 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outreachChartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: tooltipBg, border: 'none', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                  <Bar dataKey="Calls" fill="#FF9F0A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="DMs" fill={revenueColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Content Tracker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">Content Tracker</div>
          <button onClick={() => setShowContentModal(true)} className="btn-primary flex items-center gap-1 text-small">
            <Plus size={14} /> Log Content
          </button>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-apple-border">
                <th className="text-left p-2 text-apple-muted font-medium">Date</th>
                <th className="text-left p-2 text-apple-muted font-medium">Platform</th>
                <th className="text-left p-2 text-apple-muted font-medium">Type</th>
                <th className="text-left p-2 text-apple-muted font-medium">Client</th>
                <th className="text-left p-2 text-apple-muted font-medium">Caption</th>
                <th className="text-right p-2 text-apple-muted font-medium">Views</th>
                <th className="text-right p-2 text-apple-muted font-medium">Likes</th>
                <th className="text-right p-2 text-apple-muted font-medium">Comments</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {content.length === 0 && (
                <tr><td colSpan="9" className="text-center py-8 text-apple-muted">No content logged yet. Track posts, reels, and videos here.</td></tr>
              )}
              {content.map(c => (
                <tr key={c.id} className="border-b border-apple-border/50 hover:bg-apple-surface transition-colors">
                  <td className="p-2 text-apple-muted">{c.date}</td>
                  <td className="p-2">
                    {c.platform === 'instagram' && <Instagram size={14} className="text-apple-purple" />}
                    {c.platform === 'tiktok' && <span className="text-apple-text  font-medium">TikTok</span>}
                    {c.platform === 'youtube' && <Youtube size={14} className="text-apple-red" />}
                    {c.platform === 'x' && <Twitter size={14} />}
                    {c.platform === 'facebook' && <span className="text-apple-blue font-medium">FB</span>}
                  </td>
                  <td className="p-2 text-apple-muted">{c.content_type}</td>
                  <td className="p-2"><span className="badge-gray">{c.client || '—'}</span></td>
                  <td className="p-2 text-apple-muted max-w-[200px] truncate">{c.caption || '—'}</td>
                  <td className="p-2 text-right">{c.views || 0}</td>
                  <td className="p-2 text-right">{c.likes || 0}</td>
                  <td className="p-2 text-right">{c.comments || 0}</td>
                  <td className="p-2">
                    <button onClick={() => deleteContent(c.id)} aria-label="Delete content" className="text-apple-tertiary hover:text-apple-red transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 mt-3 pt-3 border-t border-apple-border text-small text-apple-muted">
            <span>Total posted: <strong className="text-apple-text">{content.length}</strong></span>
            <span>This week: <strong className="text-apple-text">{content.filter(c => c.date >= new Date(Date.now() - 7*86400000).toISOString().split('T')[0]).length}</strong></span>
          </div>
        </div>
      </div>

      {/* Google Business Profile */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">Google Business Profile</div>
          <button onClick={() => { const d = new Date(); const start = new Date(d.setDate(d.getDate() - d.getDay())); setNewGBP(p => ({ ...p, week_start: start.toISOString().split('T')[0] })); setShowGBPModal(true) }} className="btn-primary flex items-center gap-1 text-small">
            <Plus size={14} /> Log Week
          </button>
        </div>
        <div className="card">
          {gbp.length === 0 ? (
            <div className="text-center py-8 text-apple-muted">
              <BarChart3 size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-body">No GBP data yet. Log your first week.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-small">
                <thead>
                  <tr className="border-b border-apple-border">
                    <th className="text-left p-2 text-apple-muted font-medium">Week</th>
                    <th className="text-right p-2 text-apple-muted font-medium">Views</th>
                    <th className="text-right p-2 text-apple-muted font-medium">Directions</th>
                    <th className="text-right p-2 text-apple-muted font-medium">Calls</th>
                    <th className="text-right p-2 text-apple-muted font-medium">Reviews</th>
                    <th className="text-right p-2 text-apple-muted font-medium">Rating</th>
                    <th className="text-right p-2 text-apple-muted font-medium">Posts</th>
                  </tr>
                </thead>
                <tbody>
                  {gbp.map(g => (
                    <tr key={g.id} className="border-b border-apple-border/50 hover:bg-apple-surface transition-colors">
                      <td className="p-2 font-medium">{g.week_start}</td>
                      <td className="p-2 text-right">{g.profile_views || 0}</td>
                      <td className="p-2 text-right">{g.direction_requests || 0}</td>
                      <td className="p-2 text-right">{g.phone_calls || 0}</td>
                      <td className="p-2 text-right">{g.new_reviews || 0}</td>
                      <td className="p-2 text-right">{g.avg_rating ? g.avg_rating.toFixed(1) : '—'}</td>
                      <td className="p-2 text-right">{g.posts_published || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {gbp.length > 0 && (
            <div className="h-40 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gbp.slice().reverse()}>
                  <XAxis dataKey="week_start" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: tooltipBg, border: 'none', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                  <Bar dataKey="profile_views" fill={revenueColor} radius={[4, 4, 0, 0]} name="Views" />
                  <Bar dataKey="direction_requests" fill={gbpColor} radius={[4, 4, 0, 0]} name="Directions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Offer Reference */}
      <div className="card border-l-[3px] border-l-apple-amber">
        <div className="section-label mb-2">HVAC Time-Machine Offer</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-small">
          <div><span className="text-apple-muted">Price:</span> <span className="font-medium">$1,500 upfront + $50/appointment</span></div>
          <div><span className="text-apple-muted">Guarantee:</span> <span className="font-medium">30 appointments in 90 days</span></div>
          <div><span className="text-apple-muted">Services:</span> <span className="font-medium">DB Reactivation + Reputation + FB Ads + Scripts</span></div>
          <div><span className="text-apple-muted">Ad spend:</span> <span className="font-medium">~$500–600/client (outsourced)</span></div>
          <div><span className="text-apple-muted">Target:</span> <span className="font-medium">US HVAC businesses</span></div>
          <div><span className="text-apple-muted">Goal:</span> <span className="font-medium">$10K/month → scalable niche</span></div>
        </div>
      </div>

      {/* Add Prospect Modal */}
      <Modal open={showProspectModal} onClose={() => setShowProspectModal(false)} title="Add Prospect" maxWidth="lg">
        <form onSubmit={e => { e.preventDefault(); addProspect(newProspect); setShowProspectModal(false); setNewProspect({ company_name: '', contact_name: '', phone: '', state: '', status: 'new_lead', notes: '', next_action: '' }) }} className="space-y-3">
          <input type="text" value={newProspect.company_name} onChange={e => setNewProspect(p => ({ ...p, company_name: e.target.value }))} placeholder="Company name" className="input-field" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={newProspect.contact_name} onChange={e => setNewProspect(p => ({ ...p, contact_name: e.target.value }))} placeholder="Contact name" className="input-field" />
            <input type="text" value={newProspect.phone} onChange={e => setNewProspect(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={newProspect.state} onChange={e => setNewProspect(p => ({ ...p, state: e.target.value }))} placeholder="State" className="input-field" />
            <select value={newProspect.status} onChange={e => setNewProspect(p => ({ ...p, status: e.target.value }))} className="input-field">
              {prospectStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <input type="text" value={newProspect.next_action} onChange={e => setNewProspect(p => ({ ...p, next_action: e.target.value }))} placeholder="Next action" className="input-field" />
          <textarea value={newProspect.notes} onChange={e => setNewProspect(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="input-field min-h-[60px]" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowProspectModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">Add Prospect</button>
          </div>
        </form>
      </Modal>

      {/* Content Log Modal */}
      <Modal open={showContentModal} onClose={() => setShowContentModal(false)} title="Log Content" maxWidth="lg">
        <form onSubmit={e => { e.preventDefault(); addContent(newContent); setShowContentModal(false); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Date</label>
              <input type="date" value={newContent.date} onChange={e => setNewContent(p => ({ ...p, date: e.target.value }))} className="input-field text-small" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Platform</label>
              <select value={newContent.platform} onChange={e => setNewContent(p => ({ ...p, platform: e.target.value }))} className="input-field text-small">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="x">X / Twitter</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Type</label>
              <select value={newContent.content_type} onChange={e => setNewContent(p => ({ ...p, content_type: e.target.value }))} className="input-field text-small">
                <option value="post">Post</option>
                <option value="reel">Reel</option>
                <option value="short">Short</option>
                <option value="story">Story</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Client</label>
              <select value={newContent.client} onChange={e => setNewContent(p => ({ ...p, client: e.target.value }))} className="input-field text-small">
                <option value="">Personal Brand</option>
                <option value="CDZ">CDZ</option>
                <option value="HVAC">HVAC</option>
                <option value="MIX AGENCI">MIX AGENCI</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Caption</label>
            <input type="text" value={newContent.caption} onChange={e => setNewContent(p => ({ ...p, caption: e.target.value }))} placeholder="Caption or description" className="input-field text-small" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Views</label>
              <input type="number" value={newContent.views} onChange={e => setNewContent(p => ({ ...p, views: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Likes</label>
              <input type="number" value={newContent.likes} onChange={e => setNewContent(p => ({ ...p, likes: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Comments</label>
              <input type="number" value={newContent.comments} onChange={e => setNewContent(p => ({ ...p, comments: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Shares</label>
              <input type="number" value={newContent.shares} onChange={e => setNewContent(p => ({ ...p, shares: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Link</label>
            <input type="url" value={newContent.link} onChange={e => setNewContent(p => ({ ...p, link: e.target.value }))} placeholder="https://..." className="input-field text-small" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowContentModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">Log Content</button>
          </div>
        </form>
      </Modal>

      {/* GBP Modal */}
      <Modal open={showGBPModal} onClose={() => setShowGBPModal(false)} title="Log GBP Metrics" maxWidth="lg">
        <form onSubmit={e => { e.preventDefault(); addGBP(newGBP); setShowGBPModal(false); }} className="space-y-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">Week Starting</label>
            <input type="date" value={newGBP.week_start} onChange={e => setNewGBP(p => ({ ...p, week_start: e.target.value }))} className="input-field text-small" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Profile Views</label>
              <input type="number" value={newGBP.profile_views} onChange={e => setNewGBP(p => ({ ...p, profile_views: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Direction Requests</label>
              <input type="number" value={newGBP.direction_requests} onChange={e => setNewGBP(p => ({ ...p, direction_requests: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Phone Calls</label>
              <input type="number" value={newGBP.phone_calls} onChange={e => setNewGBP(p => ({ ...p, phone_calls: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">New Reviews</label>
              <input type="number" value={newGBP.new_reviews} onChange={e => setNewGBP(p => ({ ...p, new_reviews: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Avg Rating</label>
              <input type="number" step="0.1" min="0" max="5" value={newGBP.avg_rating} onChange={e => setNewGBP(p => ({ ...p, avg_rating: parseFloat(e.target.value) || 0 }))} className="input-field text-small" />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Posts Published</label>
              <input type="number" value={newGBP.posts_published} onChange={e => setNewGBP(p => ({ ...p, posts_published: parseInt(e.target.value) || 0 }))} className="input-field text-small" min="0" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowGBPModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">Log Week</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal />
    </motion.div>
  )
}
