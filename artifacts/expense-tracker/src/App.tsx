import { type CSSProperties, type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateExpense, useDeleteExpense, useGetCategoryBreakdown, useGetDashboardSummary,
  useGetMonthlyTrend, useListCategories, useListExpenses, useListRecentExpenses,
  useUpdateExpense, getListExpensesQueryKey, getListRecentExpensesQueryKey,
  getGetDashboardSummaryQueryKey, getGetCategoryBreakdownQueryKey,
  getGetMonthlyTrendQueryKey, type Expense, type ExpenseCategory, type ExpenseInput,
  type PaymentMethod,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, Car, Check, CircleHelp, DollarSign, FileText, Filter, HeartPulse,
  Home, Landmark, MoreHorizontal, Pencil, Plus, Receipt, Search, Settings2,
  ShoppingBag, Sparkles, Tag, Trash2, Utensils, WalletCards, X,
} from 'lucide-react';

const queryClient = new QueryClient();

const categoryNames: ExpenseCategory[] = ['Food','Transport','Shopping','Bills','Entertainment','Health','Travel','Other'];
const paymentMethods: PaymentMethod[] = ['Card','Cash','Bank transfer','UPI'];
const monthNow = new Date().toISOString().slice(0, 7);
const money = (value = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const prettyMonth = (month: string) => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`));
const prettyDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));

const categoryMeta: Record<string, { bg: string; fg: string; icon: typeof Utensils }> = {
  Food: { bg: 'bg-[#f8dca5]', fg: 'text-[#75501e]', icon: Utensils },
  Transport: { bg: 'bg-[#c9e2df]', fg: 'text-[#225852]', icon: Car },
  Shopping: { bg: 'bg-[#e6d6eb]', fg: 'text-[#684b72]', icon: ShoppingBag },
  Bills: { bg: 'bg-[#d5dce9]', fg: 'text-[#41516c]', icon: FileText },
  Entertainment: { bg: 'bg-[#f4c9c0]', fg: 'text-[#7a4139]', icon: Sparkles },
  Health: { bg: 'bg-[#cde4cd]', fg: 'text-[#38643e]', icon: HeartPulse },
  Travel: { bg: 'bg-[#c8dfe8]', fg: 'text-[#315c69]', icon: Landmark },
  Other: { bg: 'bg-[#dedfd7]', fg: 'text-[#59605a]', icon: Tag },
};

function CategoryIcon({ category, className = 'h-4 w-4' }: { category?: string; className?: string }) {
  const Icon = categoryMeta[category || 'Other']?.icon || Tag;
  return <Icon className={className} strokeWidth={1.8} />;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { href: '/', label: 'Overview', icon: Home },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ];
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[248px] -translate-x-full bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : ''}`}>
        <div className="flex h-full flex-col px-5 py-6">
          <div className="mb-14 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[4px_4px_0_hsl(173_27%_9%/.35)]">
              <WalletCards className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-[21px] leading-none tracking-tight">Pocket Ledger</div>
              <div className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/55">a kinder money space</div>
            </div>
          </div>
          <nav className="space-y-1">
            <div className="mb-3 px-3 font-mono-ui text-[10px] uppercase tracking-[.22em] text-sidebar-foreground/40">Your space</div>
            {links.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? location === '/' : location.startsWith(href);
              return <Link key={href} href={href} data-testid={`link-${label.toLowerCase()}`} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}>
                <Icon className={`h-[17px] w-[17px] ${active ? 'text-sidebar-primary' : ''}`} strokeWidth={1.8} /><span>{label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
              </Link>;
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary"><CircleHelp className="h-4 w-4" /></div>
            <p className="font-display text-[17px] leading-tight">Money is information, not a verdict.</p>
            <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/50">A small check-in today is enough. You’re doing the work.</p>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary font-semibold text-sidebar-primary-foreground">A</div>
            <div className="min-w-0"><div className="truncate text-sm">Alex Morgan</div><div className="font-mono-ui text-[10px] text-sidebar-foreground/40">personal ledger</div></div>
            <MoreHorizontal className="ml-auto h-4 w-4 text-sidebar-foreground/40" />
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" data-testid="button-close-navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-foreground/30 md:hidden" />}
      <main className="md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md md:px-10">
          <button aria-label="Open navigation" data-testid="button-open-navigation" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground md:hidden"><BarChart3 className="h-5 w-5" /></button>
          <div className="hidden font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground sm:block">A quieter way to look at your money</div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#6ea879]" /> All systems calm</div>
            <div data-testid="status-help" title="Pocket Ledger is designed to be checked without judgment." className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground"><CircleHelp className="h-4 w-4" /></div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function LoadingBlock({ className = '', style }: { className?: string; style?: CSSProperties }) { return <div style={style} className={`animate-pulse rounded-xl bg-muted/70 ${className}`} />; }

function ExpenseModal({ open, onOpenChange, expense }: { open: boolean; onOpenChange: (v: boolean) => void; expense?: Expense | null }) {
  const queryClient = useQueryClient();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const isEditing = Boolean(expense);
  const [form, setForm] = useState<ExpenseInput>({ amount: expense?.amount || 0, description: expense?.description || '', merchant: expense?.merchant || '', category: expense?.category || 'Food', date: expense?.date || new Date().toISOString().slice(0,10), paymentMethod: expense?.paymentMethod || 'Card', notes: expense?.notes || '' });
  const [error, setError] = useState('');
  const set = (key: keyof ExpenseInput, value: string | number) => setForm(current => ({ ...current, [key]: value }));
  const save = (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!form.amount || form.amount <= 0 || !form.description.trim() || !form.merchant.trim()) { setError('Add an amount, what it was for, and where it happened.'); return; }
    const done = () => {
      [getListExpensesQueryKey(), getListRecentExpensesQueryKey({ limit: 5 }), getGetDashboardSummaryQueryKey({ month: monthNow }), getGetCategoryBreakdownQueryKey({ month: monthNow }), getGetMonthlyTrendQueryKey({ months: 6 })].forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
      onOpenChange(false);
    };
    if (isEditing && expense) update.mutate({ id: expense.id, data: form }, { onSuccess: done, onError: () => setError('Could not update this entry. Try again.') });
    else create.mutate({ data: form }, { onSuccess: done, onError: () => setError('Could not save this entry. Try again.') });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="border-border bg-card p-0 sm:max-w-[570px]">
    <form onSubmit={save}>
      <div className="border-b border-border bg-secondary/50 px-6 py-5"><DialogHeader><DialogTitle className="font-display text-[28px] font-semibold tracking-tight">{isEditing ? 'Refine this entry' : 'Add an expense'}</DialogTitle><DialogDescription className="mt-1 text-muted-foreground">{isEditing ? 'Small corrections keep the picture honest.' : 'No judgment. Just a little more clarity.'}</DialogDescription></DialogHeader></div>
      <div className="space-y-5 px-6 py-6">
        <div className="grid grid-cols-[1fr_1.5fr] gap-4">
          <label className="field-label">Amount<div className="relative mt-2"><DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input data-testid="input-expense-amount" autoFocus type="number" min="0.01" step="0.01" value={form.amount || ''} onChange={e => set('amount', Number(e.target.value))} className="field-input pl-9 text-lg font-semibold" placeholder="0.00" /></div></label>
          <label className="field-label">What was it for?<input data-testid="input-expense-description" value={form.description} onChange={e => set('description', e.target.value)} className="field-input mt-2" placeholder="A small treat, a train ride…" /></label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="field-label">Merchant<input data-testid="input-expense-merchant" value={form.merchant} onChange={e => set('merchant', e.target.value)} className="field-input mt-2" placeholder="Where did it happen?" /></label>
          <label className="field-label">Date<input data-testid="input-expense-date" type="date" value={form.date} onChange={e => set('date', e.target.value)} className="field-input mt-2" /></label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="field-label">Category<select data-testid="select-expense-category" value={form.category} onChange={e => set('category', e.target.value)} className="field-input mt-2">{categoryNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="field-label">Paid with<select data-testid="select-expense-payment" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className="field-input mt-2">{paymentMethods.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        </div>
        <label className="field-label">Note <span className="font-normal normal-case tracking-normal text-muted-foreground/70">(optional)</span><textarea data-testid="textarea-expense-notes" value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="field-input mt-2 min-h-[72px] resize-none" placeholder="A little context for future you…" /></label>
        {error && <div data-testid="status-expense-form-error" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      </div>
      <DialogFooter className="border-t border-border bg-secondary/30 px-6 py-4"><Button type="button" variant="ghost" data-testid="button-cancel-expense" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" data-testid="button-save-expense" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Save expense'}<Check className="h-4 w-4" /></Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

function ConfirmDelete({ expense, open, onOpenChange, onDeleted }: { expense: Expense | null; open: boolean; onOpenChange: (v: boolean) => void; onDeleted: () => void }) {
  const remove = useDeleteExpense(); const queryClient = useQueryClient();
  const confirm = () => { if (!expense) return; remove.mutate({ id: expense.id }, { onSuccess: () => { [getListExpensesQueryKey(), getListRecentExpensesQueryKey({ limit: 5 }), getGetDashboardSummaryQueryKey({ month: monthNow }), getGetCategoryBreakdownQueryKey({ month: monthNow }), getGetMonthlyTrendQueryKey({ months: 6 })].forEach(queryKey => queryClient.invalidateQueries({ queryKey })); onDeleted(); onOpenChange(false); } }); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-[420px] border-border bg-card"><DialogHeader><DialogTitle className="font-display text-[27px]">Let this one go?</DialogTitle><DialogDescription className="pt-1">This will remove “{expense?.description}” from your ledger. There’s no undo, but there’s also no shame in changing your mind.</DialogDescription></DialogHeader><DialogFooter className="mt-4"><Button variant="ghost" data-testid="button-cancel-delete" onClick={() => onOpenChange(false)}>Keep it</Button><Button variant="destructive" data-testid="button-confirm-delete" onClick={confirm} disabled={remove.isPending}>{remove.isPending ? 'Removing…' : 'Remove entry'}<Trash2 className="h-4 w-4" /></Button></DialogFooter></DialogContent></Dialog>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="mb-2 font-mono-ui text-[10px] uppercase tracking-[.22em] text-muted-foreground">{eyebrow}</div><h1 className="font-display text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.04em] text-balance">{title}</h1><p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">{description}</p></div>{action}</div>;
}

function Overview() {
  const [month] = useState(monthNow);
  const summary = useGetDashboardSummary({ month });
  const breakdown = useGetCategoryBreakdown({ month });
  const trend = useGetMonthlyTrend({ months: 6 });
  const recent = useListRecentExpenses({ limit: 5 });
  const [modal, setModal] = useState(false);
  const s = summary.data;
  const maxTrend = Math.max(...(trend.data || []).map(point => point.amount), 1);
  return <div className="page-wrap">
    <PageHeader eyebrow={prettyMonth(month)} title="A clearer picture, one day at a time." description="Welcome back, Alex. Here’s what your spending is quietly telling you this month." action={<Button data-testid="button-add-expense-overview" onClick={() => setModal(true)} className="shrink-0 rounded-xl bg-primary px-5 py-3 text-primary-foreground shadow-[3px_3px_0_hsl(43_92%_61%)]"><Plus className="h-4 w-4" /> Add expense</Button>} />
    <div className="grid gap-4 lg:grid-cols-[1.45fr_.8fr_.8fr]">
      <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm sm:p-8"><div className="absolute -right-16 -top-20 h-60 w-60 rounded-full border-[32px] border-accent/15" /><div className="relative"><div className="flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary-foreground/55">Spent this month</span><span className="rounded-full bg-primary-foreground/10 px-3 py-1 font-mono-ui text-[10px] text-primary-foreground/70">{s?.month || month}</span></div>{summary.isLoading ? <LoadingBlock className="mt-5 h-14 w-48 bg-primary-foreground/15" /> : <div data-testid="text-total-spent" className="mt-4 font-display text-[clamp(3rem,6vw,4.7rem)] leading-none tracking-[-.055em]">{money(s?.totalSpent)}</div>}<div className="mt-8 flex items-end justify-between gap-5"><div className="flex-1"><div className="mb-2 flex justify-between text-xs text-primary-foreground/60"><span>Budget used</span><span className="font-mono-ui text-primary-foreground/80">{s?.budgetUsedPercent?.toFixed(1) || '0.0'}%</span></div><div className="h-2 overflow-hidden rounded-full bg-primary-foreground/10"><div className="animate-draw h-full rounded-full bg-accent" style={{ width: `${Math.min(s?.budgetUsedPercent || 0, 100)}%` }} /></div></div><div className="text-right"><div className="font-mono-ui text-[10px] text-primary-foreground/45">of</div><div className="text-sm">{money(s?.budget)}</div></div></div></div></section>
      <MetricCard label="Transactions" value={s?.transactionCount?.toString() || '0'} detail="little check-ins" icon={<Receipt />} loading={summary.isLoading} />
      <MetricCard label="Average spend" value={money(s?.averageTransaction)} detail={s?.changeFromPreviousMonth != null ? `${Math.abs(s.changeFromPreviousMonth).toFixed(1)}% ${s.changeFromPreviousMonth >= 0 ? 'more' : 'less'} than last month` : 'keep noticing'} icon={<BarChart3 />} loading={summary.isLoading} trend={s?.changeFromPreviousMonth} />
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <section className="surface-card p-6 sm:p-7"><div className="mb-7 flex items-start justify-between"><div><div className="section-kicker">The rhythm</div><h2 className="mt-1 font-display text-[25px]">Your monthly flow</h2></div><div className="rounded-lg bg-secondary p-2 text-muted-foreground"><BarChart3 className="h-4 w-4" /></div></div>{trend.isLoading ? <div className="flex h-[190px] items-end gap-3">{[80,110,64,150,100,125].map((h, i) => <LoadingBlock key={i} className="flex-1" style={{ height: h } as React.CSSProperties} />)}</div> : <div className="relative h-[210px]"><div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">{[0,1,2,3].map(i => <div key={i} className="border-t border-dashed border-border/70" />)}</div><div className="absolute inset-x-0 bottom-0 top-3 flex items-end gap-3 sm:gap-5">{(trend.data || []).map((point, i) => <div key={point.month} className="group relative flex h-full flex-1 flex-col justify-end gap-2"><div className="relative flex-1"><div className={`absolute bottom-0 left-1/2 w-full max-w-[42px] -translate-x-1/2 rounded-t-lg transition-all duration-500 group-hover:bg-accent ${i === (trend.data || []).length - 1 ? 'bg-primary' : 'bg-[#bdd4cd]'}`} style={{ height: `${Math.max(7, (point.amount / maxTrend) * 92)}%` }}><div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded-md bg-primary px-2 py-1 font-mono-ui text-[9px] text-primary-foreground group-hover:block">{money(point.amount)}</div></div></div><div className="text-center font-mono-ui text-[10px] text-muted-foreground">{point.label}</div></div>)}</div></div>}</section>
      <section className="surface-card p-6 sm:p-7"><div className="mb-6 flex items-start justify-between"><div><div className="section-kicker">Where it goes</div><h2 className="mt-1 font-display text-[25px]">By category</h2></div><Link href="/expenses" data-testid="link-view-all-categories" className="text-xs font-semibold text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground">View ledger</Link></div>{breakdown.isLoading ? <div className="space-y-5">{[1,2,3,4].map(i => <LoadingBlock key={i} className="h-8" />)}</div> : (breakdown.data || []).length === 0 ? <EmptyState compact title="Nothing filed yet" description="Your categories will appear as life happens." /> : <div className="space-y-4">{(breakdown.data || []).slice(0,5).map(item => <div key={item.category} data-testid={`row-category-${item.category}`}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${categoryMeta[item.category]?.bg} ${categoryMeta[item.category]?.fg}`}><CategoryIcon category={item.category} className="h-3.5 w-3.5" /></span>{item.category}</span><span className="font-mono-ui text-xs text-muted-foreground">{money(item.amount)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="animate-draw h-full rounded-full bg-primary/70" style={{ width: `${item.percentage}%` }} /></div></div>)}</div>}</section>
    </div>
    <section className="surface-card mt-5 p-6 sm:p-7"><div className="mb-5 flex items-end justify-between"><div><div className="section-kicker">Recent notes</div><h2 className="mt-1 font-display text-[25px]">Latest entries</h2></div><Link href="/expenses" data-testid="link-view-all-expenses" className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">See all <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>{recent.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[1,2,3,4,5].map(i => <LoadingBlock key={i} className="h-20" />)}</div> : (recent.data || []).length === 0 ? <EmptyState title="Your ledger is ready when you are" description="Add your first expense to start seeing the shape of your month." action={<Button data-testid="button-add-empty-expense" onClick={() => setModal(true)} size="sm"><Plus className="h-3.5 w-3.5" /> Add first expense</Button>} /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{(recent.data || []).map(expense => <ExpenseMini key={expense.id} expense={expense} />)}</div>}</section>
    <ExpenseModal open={modal} onOpenChange={setModal} />
  </div>;
}

function MetricCard({ label, value, detail, icon, loading, trend }: { label: string; value: string; detail: string; icon: ReactNode; loading?: boolean; trend?: number }) {
  return <section className="surface-card flex min-h-[174px] flex-col justify-between p-6"><div className="flex items-start justify-between"><div className="section-kicker">{label}</div><div className="rounded-lg bg-secondary p-2 text-muted-foreground">{icon}</div></div>{loading ? <LoadingBlock className="h-9 w-28" /> : <div><div data-testid={`text-metric-${label.toLowerCase().replace(' ','-')}`} className="font-display text-[34px] tracking-[-.04em]">{value}</div><div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{trend != null && (trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-destructive" /> : <ArrowDownRight className="h-3.5 w-3.5 text-[#4d8b75]" />)}{detail}</div></div>}</section>;
}

function ExpenseMini({ expense }: { expense: Expense }) {
  const meta = categoryMeta[expense.category] || categoryMeta.Other;
  return <div data-testid={`card-recent-expense-${expense.id}`} className="group rounded-xl border border-border/80 bg-background/40 p-3.5 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-secondary/45"><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg} ${meta.fg}`}><CategoryIcon category={expense.category} className="h-4 w-4" /></span><span className="font-mono-ui text-[10px] text-muted-foreground">{prettyDate(expense.date)}</span></div><div className="mt-4 truncate text-sm font-semibold">{expense.merchant}</div><div className="mt-0.5 truncate text-xs text-muted-foreground">{expense.description}</div><div className="mt-3 font-mono-ui text-xs">{money(expense.amount)}</div></div>;
}

function EmptyState({ title, description, action, compact = false }: { title: string; description: string; action?: ReactNode; compact?: boolean }) {
  return <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-10'}`}><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/35 text-primary"><Sparkles className="h-5 w-5" /></div><div className="font-display text-[20px]">{title}</div><p className="mt-1 max-w-[280px] text-xs leading-relaxed text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function ExpensesPage() {
  const [search, setSearch] = useState(''); const [category, setCategory] = useState<string>('all'); const [modal, setModal] = useState(false); const [editing, setEditing] = useState<Expense | null>(null); const [deleting, setDeleting] = useState<Expense | null>(null);
  const params = useMemo(() => ({ ...(search ? { search } : {}), ...(category !== 'all' ? { category: category as ExpenseCategory } : {}) }), [search, category]);
  const expenses = useListExpenses(params);
  const rows = expenses.data || [];
  const openEdit = (expense: Expense) => { setEditing(expense); setModal(true); };
  const closeModal = (open: boolean) => { setModal(open); if (!open) setEditing(null); };
  return <div className="page-wrap">
    <PageHeader eyebrow="Your ledger" title="Every little choice, in one place." description="Search, sort, and revisit your spending without turning it into a scorecard." action={<Button data-testid="button-add-expense-ledger" onClick={() => { setEditing(null); setModal(true); }} className="rounded-xl"><Plus className="h-4 w-4" /> Add expense</Button>} />
    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="relative flex-1 sm:max-w-[360px]"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input data-testid="input-search-expenses" value={search} onChange={e => setSearch(e.target.value)} className="field-input pl-9" placeholder="Search your ledger…" /><button data-testid="button-clear-search" onClick={() => setSearch('')} className={`absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-secondary ${search ? '' : 'hidden'}`}><X className="h-4 w-4" /></button></div><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><select data-testid="select-filter-category" value={category} onChange={e => setCategory(e.target.value)} className="field-input min-w-[150px]"><option value="all">All categories</option>{categoryNames.map(name => <option value={name} key={name}>{name}</option>)}</select></div></div>
      {expenses.isLoading ? <div className="space-y-3 p-5">{[1,2,3,4,5].map(i => <LoadingBlock key={i} className="h-[73px]" />)}</div> : expenses.isError ? <EmptyState title="The ledger took a breather" description="We couldn't load these entries right now." action={<Button data-testid="button-retry-expenses" onClick={() => expenses.refetch()} variant="outline">Try again</Button>} /> : rows.length === 0 ? <EmptyState title={search || category !== 'all' ? 'No entries match that' : 'A blank page can be a good start'} description={search || category !== 'all' ? 'Try a different word or category.' : 'Your future entries will make this space useful, not noisy.'} action={<Button data-testid="button-add-empty-ledger" onClick={() => { setEditing(null); setModal(true); }}><Plus className="h-4 w-4" /> Add expense</Button>} /> : <div className="divide-y divide-border/70">{rows.map(expense => <ExpenseRow key={expense.id} expense={expense} onEdit={() => openEdit(expense)} onDelete={() => setDeleting(expense)} />)}</div>}
      {rows.length > 0 && <div className="border-t border-border bg-secondary/30 px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[.15em] text-muted-foreground">{rows.length} {rows.length === 1 ? 'entry' : 'entries'} in view</div>}
    </section>
    <ExpenseModal open={modal} onOpenChange={closeModal} expense={editing} /><ConfirmDelete expense={deleting} open={Boolean(deleting)} onOpenChange={v => !v && setDeleting(null)} onDeleted={() => setDeleting(null)} />
  </div>;
}

function ExpenseRow({ expense, onEdit, onDelete }: { expense: Expense; onEdit: () => void; onDelete: () => void }) {
  const meta = categoryMeta[expense.category] || categoryMeta.Other;
  return <div data-testid={`row-expense-${expense.id}`} className="group flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/30 sm:flex-nowrap"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.fg}`}><CategoryIcon category={expense.category} /></span><div className="min-w-[145px] flex-1"><div className="font-semibold">{expense.merchant}</div><div className="mt-0.5 text-xs text-muted-foreground">{expense.description}</div></div><div className="order-3 flex w-full items-center gap-3 text-xs text-muted-foreground sm:order-none sm:w-auto sm:min-w-[115px]"><span className="rounded-md bg-secondary px-2 py-1">{expense.category}</span><span className="hidden sm:block">{prettyDate(expense.date)}</span></div><div className="font-mono-ui text-sm font-medium">{money(expense.amount)}</div><div className="flex w-full justify-end gap-1 sm:w-auto sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"><button data-testid={`button-edit-expense-${expense.id}`} onClick={onEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button><button data-testid={`button-delete-expense-${expense.id}`} onClick={onDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div></div>;
}

function SettingsPage() {
  const categories = useListCategories(); const [budget, setBudget] = useState('2400'); const [saved, setSaved] = useState(false);
  const saveBudget = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2400); };
  return <div className="page-wrap max-w-[1050px]">
    <PageHeader eyebrow="Your preferences" title="Make it feel like yours." description="A few gentle defaults to make checking in feel natural. These settings stay close to you." />
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <section className="surface-card p-6 sm:p-8"><div className="section-kicker">Monthly intention</div><h2 className="mt-1 font-display text-[28px]">A budget that guides, not judges.</h2><p className="mt-2 max-w-[500px] text-sm leading-relaxed text-muted-foreground">Choose a number that gives your month some shape. You can change it whenever your life changes.</p><div className="mt-8 max-w-[360px]"><label className="field-label">Monthly budget<div className="relative mt-2"><DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input data-testid="input-monthly-budget" type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} className="field-input pl-9 text-lg font-semibold" /></div></label><Button data-testid="button-save-budget" onClick={saveBudget} className="mt-5">{saved ? <><Check className="h-4 w-4" /> Saved for this month</> : 'Save budget'}</Button></div></section>
      <section className="surface-card paper-grid p-6 sm:p-8"><div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Sparkles className="h-5 w-5" /></div><div><div className="section-kicker">A note for you</div><h2 className="font-display text-[22px]">Keep it kind.</h2></div></div><p className="font-display text-[24px] leading-[1.2] text-primary">“The goal isn’t to spend perfectly. It’s to notice what matters.”</p><div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-[#6ea879]" /> Your ledger is private to you</div></section>
    </div>
    <section className="surface-card mt-5 p-6 sm:p-8"><div className="mb-6"><div className="section-kicker">Category palette</div><h2 className="mt-1 font-display text-[28px]">How your life shows up</h2><p className="mt-2 text-sm text-muted-foreground">These are the little labels that help your patterns become visible.</p></div>{categories.isLoading ? <div className="grid gap-3 sm:grid-cols-2">{[1,2,3,4].map(i => <LoadingBlock key={i} className="h-16" />)}</div> : categories.isError ? <EmptyState title="Categories are resting" description="Try refreshing to bring them back." action={<Button data-testid="button-retry-categories" variant="outline" onClick={() => categories.refetch()}>Try again</Button>} /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(categories.data || categoryNames.map(name => ({ name, color: '', icon: '' }))).map(item => { const meta = categoryMeta[item.name] || categoryMeta.Other; return <div data-testid={`card-category-setting-${item.name}`} key={item.name} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3.5"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.bg} ${meta.fg}`}><CategoryIcon category={item.name} /></span><div><div className="text-sm font-semibold">{item.name}</div><div className="text-xs text-muted-foreground">Included in insights</div></div><Check className="ml-auto h-4 w-4 text-[#5e9576]" /></div>; })}</div>}</section>
    <div className="mt-5 flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/35 px-4 py-3 text-xs text-muted-foreground"><Landmark className="h-4 w-4 shrink-0" /> Pocket Ledger keeps the useful bits and leaves the noise behind.</div>
  </div>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Shell>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/expenses" component={ExpensesPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
