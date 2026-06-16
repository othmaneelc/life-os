import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, PieChart, BarChart3, Trash2, Edit3, AlertTriangle } from 'lucide-react'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { useFinanceStore, useTransactions, useBudgets, useSummary, useReports, useAddTransaction, useUpdateTransaction, useDeleteTransaction, useSetBudget, useDeleteBudget, useAddDebt, useDebts, useUpdateDebt, useDeleteDebt } from '../store/financeStore'
import { useThemeStore } from '../store/themeStore'
import { staggerContainer, staggerItem } from '../utils/animations'
import Modal from '../components/Modal'
import { CardSkeleton, SummaryCardSkeleton, ListSkeleton, ChartSkeleton } from '../components/Skeleton'

const BUDGET_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6']
const EXPENSE_CATEGORIES = ['Software', 'Marketing', 'Operations', 'Tools', 'Freelancer', 'Ads', 'Office', 'Other']
const INCOME_CATEGORIES = ['Client Project', 'Retainer', 'Consulting', 'Product Sale', 'Affiliate', 'Other']

const container = staggerContainer
const itemAnim = staggerItem

export default function Finance() {
  const theme = useThemeStore(s => s.theme)
  const isDark = theme === 'dark' || theme === 'monk' || theme === 'night'
  const [tab, setTab] = useState('overview')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [editingBudget, setEditingBudget] = useState(null)
  const [txForm, setTxForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'expense', category: '', amount: '', description: '', client: '', is_personal: 0 })
  const [budgetForm, setBudgetForm] = useState({ name: '', monthly_limit: '', color: BUDGET_COLORS[0], icon: '' })

  const transactions = useFinanceStore(s => s.transactions)
  const budgets = useFinanceStore(s => s.budgets)

  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))

  const { data: summary = null, isLoading: summaryLoading } = useSummary({ month, year })
  const { isLoading: transactionsLoading } = useTransactions({ month, year })
  const { isLoading: budgetsLoading } = useBudgets({ month, year })
  const { data: reports = [], isLoading: reportsLoading } = useReports(
    new Date(now.getFullYear(), 0, 2).toISOString().split('T')[0],
    new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
  )
  const { data: debts = [], isLoading: debtsLoading } = useDebts()

  const addTransactionMutation = useAddTransaction()
  const updateTransactionMutation = useUpdateTransaction()
  const deleteTransactionMutation = useDeleteTransaction()
  const setBudgetMutation = useSetBudget()
  const deleteBudgetMutation = useDeleteBudget()
  const addDebtMutation = useAddDebt()
  const updateDebtMutation = useUpdateDebt()
  const deleteDebtMutation = useDeleteDebt()

  const formatCurrency = (n) => `${Math.round(n).toLocaleString()} MAD`

  const axisColor = isDark ? '#636366' : '#AEAEB2'

  const pieData = useMemo(() => {
    const map = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [transactions])

  const [showDebtModal, setShowDebtModal] = useState(false)
  const [debtForm, setDebtForm] = useState({ creditor: '', amount: '', interest_rate: '', due_date: '', notes: '' })
  const [editingDebt, setEditingDebt] = useState(null)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-8 max-w-6xl mx-auto space-y-6 ">
      {/* Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet size={22} className="text-apple-muted " />
          <h1 className="text-heading font-semibold ">Finance</h1>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(e.target.value)} className="input-field text-small w-28">
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
              <option key={m} value={m}>{new Date(2024, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
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
      <motion.div variants={itemAnim} className="flex gap-1 p-1 rounded-lg bg-apple-surface w-fit overflow-x-auto scrollable-x">
        {[['overview', 'Overview'], ['transactions', 'Transactions'], ['budget', 'Budget'], ['debts', 'Debts'], ['reports', 'Reports']].map(([key, label]) => (
          <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-small font-medium transition-all ${tab === key ? 'bg-apple-tab shadow-sm text-apple-text' : 'text-apple-muted hover:text-apple-text'}`}>
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <motion.div variants={itemAnim} className="space-y-6">
          {summaryLoading || transactionsLoading ? (
            <>
              <SummaryCardSkeleton />
              <CardSkeleton rows={2} />
              <ListSkeleton count={4} />
            </>
          ) : (
          <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-apple-surface transition-colors group">
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
          </>
          )}
        </motion.div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <motion.div variants={itemAnim} className="space-y-4">
          {transactionsLoading ? (
            <ListSkeleton count={6} />
          ) : (
          <>
          {transactions.length === 0 ? (
            <div className="card text-center py-8">
              <DollarSign size={28} className="mx-auto mb-2 opacity-30 text-apple-muted " />
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
                        <div className="text-small text-apple-muted">{t.date}{t.description ? ` \u00B7 ${t.description}` : ''}{t.client ? ` \u00B7 ${t.client}` : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-body font-semibold ${t.type === 'income' ? 'text-apple-green' : 'text-apple-red'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingTx(t); setTxForm({ date: t.date, type: t.type, category: t.category, amount: t.amount, description: t.description || '', client: t.client || '', is_personal: t.is_personal }); setShowAddModal(true) }} aria-label="Edit transaction" className="p-1 hover:bg-apple-surface rounded"><Edit3 size={13} className="text-apple-muted" /></button>
                        <button onClick={() => deleteTransactionMutation.mutate(t.id)} aria-label="Delete transaction" className="p-1 hover:bg-apple-red/10 rounded"><Trash2 size={13} className="text-apple-red" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
          )}
        </motion.div>
      )}

      {/* Budget Tab */}
      {tab === 'budget' && (
        <motion.div variants={itemAnim} className="space-y-4">
          {budgetsLoading ? (
            <CardSkeleton rows={5} height="h-12" />
          ) : (
          <>
          <div className="flex items-center justify-between">
            <span className="section-label">Monthly Budgets</span>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingBudget(null); setBudgetForm({ name: '', monthly_limit: '', color: BUDGET_COLORS[0], icon: '' }); setShowBudgetModal(true) }} className="btn-primary flex items-center gap-1 text-small">
              <Plus size={14} /> Add Category
            </motion.button>
          </div>
          {budgets.length === 0 ? (
            <div className="card text-center py-8">
              <PieChart size={28} className="mx-auto mb-2 opacity-30 text-apple-muted " />
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
                        <button onClick={() => { setEditingBudget(b); setBudgetForm({ name: b.name, monthly_limit: b.monthly_limit, color: b.color, icon: b.icon || '' }); setShowBudgetModal(true) }} aria-label="Edit budget" className="p-1 hover:bg-apple-surface rounded"><Edit3 size={13} className="text-apple-muted" /></button>
                        <button onClick={() => deleteBudgetMutation.mutate(b.id)} aria-label="Delete budget" className="p-1 hover:bg-apple-red/10 rounded"><Trash2 size={13} className="text-apple-red" /></button>
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
          </>
          )}
        </motion.div>
      )}

      {/* Debts Tab */}
      {tab === 'debts' && (
        <motion.div variants={itemAnim} className="space-y-4">
          {debtsLoading ? (
            <CardSkeleton rows={4} />
          ) : (
          <>
          <div className="flex items-center justify-between">
            <span className="section-label">Debts & Liabilities</span>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingDebt(null); setDebtForm({ creditor: '', amount: '', interest_rate: '', due_date: '', notes: '' }); setShowDebtModal(true) }} className="btn-primary flex items-center gap-1 text-small">
              <Plus size={14} /> Add Debt
            </motion.button>
          </div>
          {debts.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-body text-apple-muted">No debts recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {debts.map(d => {
                const totalPaid = d.payments ? d.payments.reduce((s, p) => s + p.amount, 0) : 0
                const remaining = Math.max(d.amount - totalPaid, 0)
                const pct = d.amount > 0 ? Math.round((totalPaid / d.amount) * 100) : 0
                return (
                  <div key={d.id} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-body font-medium text-apple-text ">{d.creditor}</span>
                        {d.notes && <span className="text-small text-apple-muted ml-2">{d.notes}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-small text-apple-muted">{formatCurrency(remaining)} remaining</span>
                        <button onClick={() => { setEditingDebt(d); setDebtForm({ creditor: d.creditor, amount: d.amount, interest_rate: d.interest_rate || '', due_date: d.due_date || '', notes: d.notes || '' }); setShowDebtModal(true) }} aria-label="Edit debt" className="p-1 hover:bg-apple-surface rounded"><Edit3 size={13} className="text-apple-muted" /></button>
                        <button onClick={() => deleteDebtMutation.mutate(d.id)} aria-label="Delete debt" className="p-1 hover:bg-apple-red/10 rounded"><Trash2 size={13} className="text-apple-red" /></button>
                      </div>
                    </div>
                    <div className="h-2 bg-apple-surface rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                        className="h-full rounded-full bg-apple-green" />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-micro text-apple-muted">{pct}% paid</span>
                      {d.interest_rate > 0 && <span className="text-micro text-apple-amber">{d.interest_rate}% APR</span>}
                      {d.due_date && <span className="text-micro text-apple-muted">Due {d.due_date}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </>
          )}
        </motion.div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <motion.div variants={itemAnim} className="space-y-6">
          {reportsLoading ? (
            <ChartSkeleton />
          ) : reports.length > 0 && (
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
          {!reportsLoading && pieData.length > 0 && (
            <div className="card">
              <span className="section-label mb-4">Spending by Category</span>
              <div className="flex items-center gap-6 stack-on-mobile">
                <ResponsiveContainer width={200} height={200}>
                  <RPieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieData.map(entry => <Cell key={entry.name} fill={BUDGET_COLORS[pieData.indexOf(entry) % BUDGET_COLORS.length]} />)}
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
        </motion.div>
      )}

      {/* Add/Edit Transaction Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingTx ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={async (e) => {
          e.preventDefault()
          const payload = { ...txForm, amount: parseFloat(txForm.amount) }
          try {
            if (editingTx) {
              await updateTransactionMutation.mutateAsync({ id: editingTx.id, updates: payload })
            } else {
              await addTransactionMutation.mutateAsync(payload)
            }
            setShowAddModal(false)
          } catch {}
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="label">Type</label>
              <select value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <select value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))} className="input-field" required>
              <option value="">Select category</option>
              {(txForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount (MAD)</label>
            <input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="label">Description <span className="text-apple-muted">(optional)</span></label>
            <input type="text" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Client <span className="text-apple-muted">(optional)</span></label>
            <input type="text" value={txForm.client} onChange={e => setTxForm(f => ({ ...f, client: e.target.value }))} className="input-field" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_personal" checked={txForm.is_personal === 1} onChange={e => setTxForm(f => ({ ...f, is_personal: e.target.checked ? 1 : 0 }))} className="rounded" />
            <label htmlFor="is_personal" className="text-small text-apple-text">Personal expense</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(false)} className="btn-ghost text-small">Cancel</motion.button>
            <motion.button type="submit" whileTap={{ scale: 0.95 }} className="btn-primary text-small">{editingTx ? 'Update' : 'Add'}</motion.button>
          </div>
        </form>
      </Modal>

      {/* Budget Modal */}
      <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title={editingBudget ? 'Edit Budget' : 'Add Budget Category'}>
        <form onSubmit={async (e) => {
          e.preventDefault()
          try {
            await setBudgetMutation.mutateAsync({ id: editingBudget?.id, name: budgetForm.name, monthly_limit: parseFloat(budgetForm.monthly_limit), color: budgetForm.color, icon: budgetForm.icon || null })
            setShowBudgetModal(false)
          } catch {}
        }} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" value={budgetForm.name} onChange={e => setBudgetForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="label">Monthly Limit (MAD)</label>
            <input type="number" step="0.01" value={budgetForm.monthly_limit} onChange={e => setBudgetForm(f => ({ ...f, monthly_limit: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2">
              {BUDGET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setBudgetForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition-all ${budgetForm.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] ring-apple-blue' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setShowBudgetModal(false)} className="btn-ghost text-small">Cancel</motion.button>
            <motion.button type="submit" whileTap={{ scale: 0.95 }} className="btn-primary text-small">{editingBudget ? 'Update' : 'Add'}</motion.button>
          </div>
        </form>
      </Modal>

      {/* Debt Modal */}
      <Modal isOpen={showDebtModal} onClose={() => setShowDebtModal(false)} title={editingDebt ? 'Edit Debt' : 'Add Debt'}>
        <form onSubmit={async (e) => {
          e.preventDefault()
          const payload = { ...debtForm, amount: parseFloat(debtForm.amount) }
          try {
            if (editingDebt) {
              await updateDebtMutation.mutateAsync({ id: editingDebt.id, updates: payload })
            } else {
              await addDebtMutation.mutateAsync(payload)
            }
            setShowDebtModal(false)
          } catch {}
        }} className="space-y-4">
          <div>
            <label className="label">Creditor</label>
            <input type="text" value={debtForm.creditor} onChange={e => setDebtForm(f => ({ ...f, creditor: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="label">Amount (MAD)</label>
            <input type="number" step="0.01" value={debtForm.amount} onChange={e => setDebtForm(f => ({ ...f, amount: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="label">Interest Rate % <span className="text-apple-muted">(optional)</span></label>
            <input type="number" step="0.01" value={debtForm.interest_rate} onChange={e => setDebtForm(f => ({ ...f, interest_rate: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Due Date <span className="text-apple-muted">(optional)</span></label>
            <input type="date" value={debtForm.due_date} onChange={e => setDebtForm(f => ({ ...f, due_date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Notes <span className="text-apple-muted">(optional)</span></label>
            <textarea value={debtForm.notes} onChange={e => setDebtForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setShowDebtModal(false)} className="btn-ghost text-small">Cancel</motion.button>
            <motion.button type="submit" whileTap={{ scale: 0.95 }} className="btn-primary text-small">{editingDebt ? 'Update' : 'Add'}</motion.button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
