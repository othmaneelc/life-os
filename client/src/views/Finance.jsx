import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, PieChart, BarChart3, Trash2, Edit3, AlertTriangle } from 'lucide-react'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { useFinanceStore } from '../store/financeStore'
import { useThemeStore } from '../store/themeStore'
import { staggerContainer, staggerItem } from '../utils/animations'
import Modal from '../components/Modal'

const BUDGET_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6']
const EXPENSE_CATEGORIES = ['Software', 'Marketing', 'Operations', 'Tools', 'Freelancer', 'Ads', 'Office', 'Other']
const INCOME_CATEGORIES = ['Client Project', 'Retainer', 'Consulting', 'Product Sale', 'Affiliate', 'Other']

const container = staggerContainer
const itemAnim = staggerItem

export default function Finance() {
  const theme = useThemeStore(s => s.theme)
  const isDark = theme === 'dark' || theme === 'monk'
  const [tab, setTab] = useState('overview')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [editingBudget, setEditingBudget] = useState(null)
  const [txForm, setTxForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'expense', category: '', amount: '', description: '', client: '', is_personal: 0 })
  const [budgetForm, setBudgetForm] = useState({ name: '', monthly_limit: '', color: BUDGET_COLORS[0], icon: '' })

  const transactions = useFinanceStore(s => s.transactions)
  const budgets = useFinanceStore(s => s.budgets)
  const summary = useFinanceStore(s => s.summary)
  const reports = useFinanceStore(s => s.reports)
  const fetchTransactions = useFinanceStore(s => s.fetchTransactions)
  const addTransaction = useFinanceStore(s => s.addTransaction)
  const updateTransaction = useFinanceStore(s => s.updateTransaction)
  const deleteTransaction = useFinanceStore(s => s.deleteTransaction)
  const fetchBudgets = useFinanceStore(s => s.fetchBudgets)
  const setBudget = useFinanceStore(s => s.setBudget)
  const deleteBudget = useFinanceStore(s => s.deleteBudget)
  const fetchReports = useFinanceStore(s => s.fetchReports)
  const fetchSummary = useFinanceStore(s => s.fetchSummary)

  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))

  useEffect(() => {
    fetchTransactions({ month, year }).catch(() => {})
    fetchBudgets({ month, year }).catch(() => {})
    fetchSummary({ month, year }).catch(() => {})
    const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
    fetchReports(start, end).catch(() => {})
  }, [month, year])

  const formatCurrency = (n) => `${Math.round(n).toLocaleString()} MAD`

  const axisColor = isDark ? '#636366' : '#AEAEB2'
  const textColor = isDark ? '#F5F5F7' : '#1D1D1F'

  const pieData = useMemo(() => {
    const map = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [transactions])

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-8 max-w-6xl mx-auto space-y-6 ">
      {/* Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet size={22} className="text-apple-muted" />
          <h1 className="text-heading font-semibold ">Finance</h1>
        </div>
        <div className="flex items-center gap-3">
          <select value={month} onChange={e => setMonth(e.target.value)} className="input-field text-small w-24">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{new Date(2026, i).toLocaleString('en', { month: 'short' })}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)} className="input-field text-small w-20">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingTx(null); setTxForm({ date: new Date().toISOString().split('T')[0], type: 'expense', category: '', amount: '', description: '', client: '', is_personal: 0 }); setShowAddModal(true) }} className="btn-primary flex items-center gap-1">
            <Plus size={15} /> Add
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemAnim} className="flex gap-1 p-1 rounded-lg bg-apple-surface w-fit">
        {[['overview', 'Overview'], ['transactions', 'Transactions'], ['budget', 'Budget'], ['reports', 'Reports']].map(([key, label]) => (
          <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-small font-medium transition-all ${tab === key ? 'bg-apple-tab shadow-sm text-apple-text' : 'text-apple-muted hover:text-apple-text'}`}>
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <motion.div variants={itemAnim} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-apple-green" />
                <span className="section-label">Income</span>
              </div>
              <div className="text-heading font-semibold text-apple-green">{formatCurrency(summary?.totalIncome || 0)}</div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} className="text-apple-red" />
                <span className="section-label">Expenses</span>
              </div>
              <div className="text-heading font-semibold text-apple-red">{formatCurrency(summary?.totalExpense || 0)}</div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className={summary?.net >= 0 ? 'text-apple-green' : 'text-apple-red'} />
                <span className="section-label">Net</span>
              </div>
              <div className={`text-heading font-semibold ${summary?.net >= 0 ? 'text-apple-green' : 'text-apple-red'}`}>{formatCurrency(summary?.net || 0)}</div>
            </div>
          </div>

          {/* Budget Progress */}
          {summary?.budgetAlerts?.length > 0 && (
            <div className="card">
              <span className="section-label mb-3">Budget Progress</span>
              <div className="space-y-3">
                {summary.budgetAlerts.map(b => (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-small text-apple-text ">{b.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-small text-apple-muted">{formatCurrency(b.spent)} / {formatCurrency(b.limit)}</span>
                        {b.pct >= 100 && <AlertTriangle size={14} className="text-apple-red" />}
                      </div>
                    </div>
                    <div className="h-1.5 bg-apple-surface rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(b.pct, 100)}%` }} transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${b.pct >= 100 ? 'bg-apple-red' : b.pct >= 80 ? 'bg-apple-amber' : 'bg-apple-blue'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="card">
            <span className="section-label mb-3">Recent Transactions</span>
            {transactions.length === 0 ? (
              <p className="text-body text-apple-muted py-4 text-center">No transactions this month</p>
            ) : (
              <div className="space-y-1">
                {transactions.slice(0, 8).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-apple-surface transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-6 rounded-full ${t.type === 'income' ? 'bg-apple-green' : 'bg-apple-red'}`} />
                      <div>
                        <span className="text-body font-medium text-apple-text ">{t.category}</span>
                        {t.description && <span className="text-small text-apple-muted ml-2">{t.description}</span>}
                      </div>
                    </div>
                    <span className={`text-body font-semibold ${t.type === 'income' ? 'text-apple-green' : 'text-apple-red'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <motion.div variants={itemAnim} className="space-y-4">
          {transactions.length === 0 ? (
            <div className="card text-center py-8">
              <DollarSign size={28} className="mx-auto mb-2 opacity-30 text-apple-muted" />
              <p className="text-body text-apple-muted">No transactions yet</p>
              <p className="text-small text-apple-muted mt-1">Click "Add" to record your first transaction</p>
            </div>
          ) : (
            <div className="card">
              <div className="space-y-1">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-apple-surface transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-8 rounded-full ${t.type === 'income' ? 'bg-apple-green' : 'bg-apple-red'}`} />
                      <div>
                        <span className="text-body font-medium text-apple-text ">{t.category}</span>
                        <div className="text-small text-apple-muted">{t.date}{t.description ? ` · ${t.description}` : ''}{t.client ? ` · ${t.client}` : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-body font-semibold ${t.type === 'income' ? 'text-apple-green' : 'text-apple-red'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingTx(t); setTxForm({ date: t.date, type: t.type, category: t.category, amount: t.amount, description: t.description || '', client: t.client || '', is_personal: t.is_personal }); setShowAddModal(true) }} className="p-1 hover:bg-apple-surface rounded"><Edit3 size={13} className="text-apple-muted" /></button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-1 hover:bg-apple-red/10 rounded"><Trash2 size={13} className="text-apple-red" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Budget Tab */}
      {tab === 'budget' && (
        <motion.div variants={itemAnim} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="section-label">Monthly Budgets</span>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingBudget(null); setBudgetForm({ name: '', monthly_limit: '', color: BUDGET_COLORS[0], icon: '' }); setShowBudgetModal(true) }} className="btn-primary flex items-center gap-1 text-small">
              <Plus size={14} /> Add Category
            </motion.button>
          </div>
          {budgets.length === 0 ? (
            <div className="card text-center py-8">
              <PieChart size={28} className="mx-auto mb-2 opacity-30 text-apple-muted" />
              <p className="text-body text-apple-muted">No budget categories set</p>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map(b => {
                const pct = b.monthly_limit > 0 ? Math.round((b.spent / b.monthly_limit) * 100) : 0
                return (
                  <div key={b.id} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                        <span className="text-body font-medium text-apple-text ">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-small text-apple-muted">{formatCurrency(b.spent || 0)} / {formatCurrency(b.monthly_limit)}</span>
                        <button onClick={() => { setEditingBudget(b); setBudgetForm({ name: b.name, monthly_limit: b.monthly_limit, color: b.color, icon: b.icon || '' }); setShowBudgetModal(true) }} className="p-1 hover:bg-apple-surface rounded"><Edit3 size={13} className="text-apple-muted" /></button>
                        <button onClick={() => deleteBudget(b.id)} className="p-1 hover:bg-apple-red/10 rounded"><Trash2 size={13} className="text-apple-red" /></button>
                      </div>
                    </div>
                    <div className="h-2 bg-apple-surface rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.5 }}
                        className="h-full rounded-full" style={{ backgroundColor: pct >= 100 ? '#FF3B30' : pct >= 80 ? '#FF9F0A' : b.color }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-micro font-medium ${pct >= 100 ? 'text-apple-red' : pct >= 80 ? 'text-apple-amber' : 'text-apple-muted'}`}>
                        {pct >= 100 ? 'Over budget!' : pct >= 80 ? `${pct}% used` : `${pct}% of budget`}
                      </span>
                      <span className="text-micro text-apple-muted">{formatCurrency(Math.max(b.monthly_limit - (b.spent || 0), 0))} remaining</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <motion.div variants={itemAnim} className="space-y-6">
          {reports.length > 0 && (
            <div className="card">
              <span className="section-label mb-4">Income vs Expenses</span>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={reports}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2C2C2E' : '#E5E5EA'} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: axisColor }} />
                  <YAxis tick={{ fontSize: 12, fill: axisColor }} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#fff', border: `1px solid ${isDark ? '#2C2C2E' : '#E5E5EA'}`, borderRadius: 8 }} />
                  <Bar dataKey="income" fill={isDark ? '#30D158' : '#34C759'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill={isDark ? '#FF453A' : '#FF3B30'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {pieData.length > 0 && (
            <div className="card">
              <span className="section-label mb-4">Spending by Category</span>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={200} height={200}>
                  <RPieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={BUDGET_COLORS[i % BUDGET_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#fff', border: `1px solid ${isDark ? '#2C2C2E' : '#E5E5EA'}`, borderRadius: 8 }} />
                  </RPieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BUDGET_COLORS[i % BUDGET_COLORS.length] }} />
                      <span className="text-small text-apple-text ">{d.name}</span>
                      <span className="text-small text-apple-muted">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reports.length === 0 && pieData.length === 0 && (
            <div className="card text-center py-8">
              <BarChart3 size={28} className="mx-auto mb-2 opacity-30 text-apple-muted" />
              <p className="text-body text-apple-muted">No data yet</p>
              <p className="text-small text-apple-muted mt-1">Add transactions to see reports</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Add/Edit Transaction Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={editingTx ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={e => {
          e.preventDefault()
          if (!txForm.category || !txForm.amount) return
          const tx = { ...txForm, amount: parseFloat(txForm.amount) }
          if (editingTx) updateTransaction(editingTx.id, tx)
          else addTransaction(tx)
          setShowAddModal(false)
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Type</label>
              <select value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value, category: '' }))} className="input-field">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="section-label block mb-1">Scope</label>
              <select value={txForm.is_personal} onChange={e => setTxForm(f => ({ ...f, is_personal: parseInt(e.target.value) }))} className="input-field">
                <option value={0}>Agency</option>
                <option value={1}>Personal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="section-label block mb-1">Category</label>
            <select value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))} className="input-field" required>
              <option value="">Select...</option>
              {(txForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Amount (MAD)</label>
              <input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} className="input-field" placeholder="0" required />
            </div>
            <div>
              <label className="section-label block mb-1">Date</label>
              <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="section-label block mb-1">Description</label>
            <input type="text" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Optional" />
          </div>
          {txForm.is_personal === 0 && (
            <div>
              <label className="section-label block mb-1">Client</label>
              <input type="text" value={txForm.client} onChange={e => setTxForm(f => ({ ...f, client: e.target.value }))} className="input-field" placeholder="Optional" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">{editingTx ? 'Update' : 'Add'}</motion.button>
          </div>
        </form>
      </Modal>

      {/* Budget Modal */}
      <Modal open={showBudgetModal} onClose={() => setShowBudgetModal(false)} title={editingBudget ? 'Edit Budget' : 'Add Budget Category'} maxWidth="sm">
        <form onSubmit={e => {
          e.preventDefault()
          if (!budgetForm.name || !budgetForm.monthly_limit) return
          setBudget({ ...budgetForm, id: editingBudget?.id, monthly_limit: parseFloat(budgetForm.monthly_limit) })
          setShowBudgetModal(false)
        }} className="space-y-3">
          <div>
            <label className="section-label block mb-1">Category Name</label>
            <input type="text" value={budgetForm.name} onChange={e => setBudgetForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g., Software" required />
          </div>
          <div>
            <label className="section-label block mb-1">Monthly Limit (MAD)</label>
            <input type="number" step="0.01" value={budgetForm.monthly_limit} onChange={e => setBudgetForm(f => ({ ...f, monthly_limit: e.target.value }))} className="input-field" placeholder="0" required />
          </div>
          <div>
            <label className="section-label block mb-1">Color</label>
            <div className="flex gap-2">
              {BUDGET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setBudgetForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${budgetForm.color === c ? 'ring-2 ring-offset-2 ring-apple-blue' : 'opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowBudgetModal(false)} className="btn-ghost">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">{editingBudget ? 'Update' : 'Add'}</motion.button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
