import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plane,
  Plus,
  Receipt,
  Search,
  Settings2,
  ShoppingBag,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import {
  type Budget,
  type Category,
  type PaymentMethod,
  type Transaction,
  type TransactionInput,
  type TransactionType,
  getGetCategoryBreakdownQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetIncomeExpenseTrendQueryKey,
  getGetMonthlyTrendQueryKey,
  getGetSevenDayTrendQueryKey,
  getListBudgetsQueryKey,
  getListCategoriesQueryKey,
  getListExpensesQueryKey,
  getListRecentExpensesQueryKey,
  useCreateBudget,
  useCreateCategory,
  useCreateExpense,
  useDeleteBudget,
  useDeleteExpense,
  useGetCategoryBreakdown,
  useGetDashboardSummary,
  useGetIncomeExpenseTrend,
  useGetMonthlyTrend,
  useGetSevenDayTrend,
  useListBudgets,
  useListCategories,
  useListExpenses,
  useListRecentExpenses,
  useUpdateExpense,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NotFound from "@/pages/not-found";
import { Toaster, toast } from "sonner";
import "./index.css";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => today().slice(0, 7);
const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00`),
  );

const defaultCategoryNames = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Education",
  "Entertainment",
  "Salary",
  "Transport",
  "Health",
  "Other",
];
const paymentMethods: PaymentMethod[] = ["Card", "Cash", "Bank transfer", "UPI"];
const chartColors = ["#6c5ce7", "#00cec9", "#ff7675", "#f6c85f", "#8e7dff", "#4d96ff"];

const iconMap: Record<string, typeof Utensils> = {
  Food: Utensils,
  Travel: Plane,
  Shopping: ShoppingBag,
  Bills: Receipt,
  Education: GraduationCap,
  Entertainment: Clapperboard,
  Salary: BriefcaseBusiness,
  Transport: Car,
  Health: HeartPulse,
  Other: Tag,
};

function CategoryIcon({ category, className = "h-4 w-4" }: { category?: string; className?: string }) {
  const Icon = iconMap[category ?? "Other"] ?? Tag;
  return <Icon className={className} strokeWidth={1.8} />;
}

function invalidateFinanceQueries() {
  void queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
  void queryClient.invalidateQueries({ queryKey: getListRecentExpensesQueryKey({ limit: 5 }) });
  void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({ month: currentMonth() }) });
  void queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownQueryKey({ month: currentMonth() }) });
  void queryClient.invalidateQueries({ queryKey: getGetMonthlyTrendQueryKey({ months: 6 }) });
  void queryClient.invalidateQueries({ queryKey: getGetSevenDayTrendQueryKey({ endDate: today() }) });
  void queryClient.invalidateQueries({ queryKey: getGetIncomeExpenseTrendQueryKey({ months: 6 }) });
  void queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ month: currentMonth() }) });
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#080b14] text-white">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] shadow-[0_15px_40px_rgba(108,92,231,.3)]">
          <WalletCards className="h-8 w-8 text-[#080b14]" />
        </div>
        <p className="text-sm text-[#858ba1]">Preparing your finance space…</p>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="logo-mark mx-auto">
          <WalletCards className="h-8 w-8 text-[#080b14]" />
        </div>
        <h1 className="mt-6 text-center text-[30px] font-bold tracking-[-.04em]">ExpenseFlow</h1>
        <p className="mt-2 text-center text-sm text-[#858ba1]">
          A clearer way to manage your money.
        </p>
        <div className="mt-8 space-y-3">
          <Link href="/sign-in" className="gradient-button block text-center">
            Welcome back <ArrowUpRight className="ml-2 inline h-4 w-4" />
          </Link>
          <Link href="/sign-up" className="outline-button block text-center">
            Create your account
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[.14em] text-[#62697e]">
          <span>Private</span>
          <span>Simple</span>
          <span>INR ready</span>
        </div>
      </section>
    </main>
  );
}

function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <main className="auth-page">
      {mode === "sign-in" ? (
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
        />
      ) : (
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
        />
      )}
    </main>
  );
}

function RootRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Landing />;
}

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/budgets", label: "Budgets", icon: WalletCards },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: Settings2 },
  ];
  const displayName = user?.firstName || user?.emailAddresses[0]?.emailAddress || "Your account";
  const logout = () => void signOut({ redirectUrl: basePath || "/" });
  return (
    <div className="min-h-[100dvh] bg-[#080b14] text-white">
      <aside className={`app-sidebar ${mobileOpen ? "translate-x-0" : ""}`}>
        <div className="flex h-full flex-col px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <div className="logo-mark h-11 w-11 rounded-[13px]">
              <WalletCards className="h-5 w-5 text-[#080b14]" />
            </div>
            <div>
              <div className="text-[22px] font-bold tracking-[-.04em]">ExpenseFlow</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[.15em] text-[#777e94]">
                Personal finance
              </div>
            </div>
          </Link>
          <nav className="mt-14 space-y-2">
            <div className="mb-4 px-3 text-[10px] uppercase tracking-[.2em] text-[#62697e]">Workspace</div>
            {links.map(({ href, label, icon: Icon }) => {
              const active = location === href || (href !== "/dashboard" && location.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-link ${active ? "active" : ""}`}
                >
                  <Icon className="h-[17px] w-[17px]" />
                  <span>{label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00cec9]" />}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-[#2b3041] bg-[#111625] p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#6c5ce7]/15 text-[#a79cff]">
              <CircleHelp className="h-4 w-4" />
            </div>
            <p className="text-[16px] font-semibold leading-tight">Small steps add up.</p>
            <p className="mt-2 text-xs leading-relaxed text-[#777e94]">
              Your money is information, not a verdict.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-[#292f42] pt-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] font-bold text-[#080b14]">
              {(user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || "U").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{displayName}</div>
              <div className="truncate text-[10px] text-[#62697e]">Private ledger</div>
            </div>
            <button type="button" aria-label="Log out" onClick={logout} className="ml-auto rounded-lg p-2 text-[#777e94] hover:bg-[#181d2c] hover:text-[#ff7675]">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />}
      <main className="md:pl-[250px]">
        <header className="app-header">
          <button type="button" aria-label="Open navigation" className="rounded-lg p-2 text-[#858ba1] md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden text-xs text-[#858ba1] sm:block">
            {new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-[#292f42] bg-[#101421] px-3 py-1.5 text-xs text-[#858ba1] sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00cec9]" /> All systems calm
            </span>
            <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#303649] bg-[#121624] text-[#858ba1] hover:text-white">
              <Settings2 className="h-4 w-4" />
            </Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[.2em] text-[#777e94]">{eyebrow}</div>
        <h1 className="text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1] tracking-[-.055em]">{title}</h1>
        <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-[#858ba1]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`dark-card ${className}`}>{children}</section>;
}

function SummaryCard({ label, value, tone, icon: Icon }: { label: string; value: string; tone: "income" | "expense"; icon: typeof ArrowUpRight }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`summary-icon ${tone}`}><Icon className="h-6 w-6" /></div>
      <div>
        <p className="text-xs text-[#858ba1]">{label}</p>
        <h2 className={`mt-1 text-[22px] font-bold ${tone === "income" ? "text-[#00cec9]" : "text-[#ff7675]"}`}>{value}</h2>
      </div>
    </Card>
  );
}

type FormState = {
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  merchant: string;
  paymentMethod: PaymentMethod;
  notes: string;
};

function emptyForm(): FormState {
  return { description: "", amount: 0, type: "expense", category: "Food", date: today(), merchant: "", paymentMethod: "Card", notes: "" };
}

function TransactionForm({ onSaved, editing, onCancel }: { onSaved: () => void; editing?: Transaction | null; onCancel?: () => void }) {
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const categories = useListCategories();
  const [form, setForm] = useState<FormState>(emptyForm);
  const isEditing = Boolean(editing);
  useEffect(() => {
    if (editing) {
      setForm({
        description: editing.description,
        amount: editing.amount,
        type: editing.type,
        category: editing.category,
        date: editing.date,
        merchant: editing.merchant ?? "",
        paymentMethod: editing.paymentMethod ?? "Card",
        notes: editing.notes ?? "",
      });
    } else setForm(emptyForm());
  }, [editing]);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = (event: FormEvent): void => {
    event.preventDefault();
    if (!form.description.trim()) {
      toast.error("Please enter a description.");
      return;
    }
    if (!Number.isFinite(form.amount) || form.amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!form.date) {
      toast.error("Please select a date.");
      return;
    }
    const payload: TransactionInput = { ...form, merchant: form.merchant || "Personal", notes: form.notes || null };
    const onSuccess = () => {
      invalidateFinanceQueries();
      toast.success(isEditing ? "Transaction updated successfully" : "Transaction added successfully");
      onSaved();
    };
    if (editing) update.mutate({ id: editing.id, data: payload }, { onSuccess, onError: () => toast.error("Could not update this transaction.") });
    else create.mutate({ data: payload }, { onSuccess, onError: () => toast.error("Could not save this transaction.") });
  };
  const categoryOptions = (categories.data ?? []).map((item) => item.name);
  const options = categoryOptions.length ? categoryOptions : defaultCategoryNames;
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[19px] font-bold">{isEditing ? "Edit Transaction" : "Add Transaction"}</h2>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6c5ce7]/15 text-[#a79cff]"><Plus className="h-5 w-5" /></div>
      </div>
      <label className="input-label">Description<input data-testid="input-transaction-description" value={form.description} onChange={(e) => set("description", e.target.value)} className="dark-input mt-2" placeholder="e.g. Groceries" /></label>
      <label className="input-label">Amount<div className="relative mt-2"><DollarSign className="absolute left-3 top-3 h-4 w-4 text-[#777e94]" /><input data-testid="input-transaction-amount" type="number" min="0.01" step="0.01" value={form.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} className="dark-input pl-9" placeholder="₹ 0" /></div></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="input-label">Type<select data-testid="select-transaction-type" value={form.type} onChange={(e) => set("type", e.target.value as TransactionType)} className="dark-input mt-2"><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label className="input-label">Category<select data-testid="select-transaction-category" value={form.category} onChange={(e) => set("category", e.target.value)} className="dark-input mt-2">{options.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="input-label">Date<input data-testid="input-transaction-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="dark-input mt-2" /></label>
        <label className="input-label">Paid with<select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value as PaymentMethod)} className="dark-input mt-2">{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
      </div>
      <label className="input-label">Note <span className="normal-case tracking-normal text-[#62697e]">(optional)</span><input value={form.notes} onChange={(e) => set("notes", e.target.value)} className="dark-input mt-2" placeholder="Add context" /></label>
      <div className="flex gap-2">
        {onCancel && <button type="button" className="outline-button flex-1" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="gradient-button flex-1" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? "Saving…" : isEditing ? "Update Transaction" : "+ Add Transaction"}</button>
      </div>
    </form>
  );
}

function ConfirmDelete({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const remove = useDeleteExpense();
  const confirm = () => remove.mutate({ id: transaction.id }, {
    onSuccess: () => { invalidateFinanceQueries(); toast.success("Transaction deleted successfully"); onClose(); },
    onError: () => toast.error("Could not delete this transaction."),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="dark-dialog">
        <DialogHeader><DialogTitle>Delete transaction?</DialogTitle><DialogDescription>Are you sure you want to delete “{transaction.description}”?</DialogDescription></DialogHeader>
        <DialogFooter><button className="outline-button" onClick={onClose}>Keep it</button><button className="danger-button" onClick={confirm} disabled={remove.isPending}>{remove.isPending ? "Deleting…" : "Delete transaction"}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Dashboard() {
  const month = currentMonth();
  const summary = useGetDashboardSummary({ month });
  const sevenDay = useGetSevenDayTrend({ endDate: today() });
  const categoryBreakdown = useGetCategoryBreakdown({ month });
  const trend = useGetMonthlyTrend({ months: 6 });
  const incomeExpense = useGetIncomeExpenseTrend({ months: 6 });
  const recent = useListRecentExpenses({ limit: 6 });
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const s = summary.data;
  const maxDay = Math.max(...(sevenDay.data ?? []).map((item) => item.amount), 1);
  return (
    <div className="page-wrap">
      <PageHeader eyebrow={monthLabel(month)} title="Welcome back. Let's make it count." description="Your money at a glance — what came in, what went out, and the choices shaping your month." action={<button className="gradient-button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add transaction</button>} />
      <div className="dashboard-grid">
        <Card className="balance-card">
          <span className="balance-label">Total Balance</span>
          <div className="balance-value">{money(s?.balance)}</div>
          <div className="balance-bottom"><span>Income − Expenses</span><span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Smart spending</span></div>
        </Card>
        <Card className="p-6">
          <TransactionForm onSaved={() => setFormOpen(false)} editing={editing} onCancel={editing ? () => setEditing(null) : undefined} />
        </Card>
        <div className="summary-grid">
          <SummaryCard label="Total Income" value={money(s?.totalIncome)} tone="income" icon={ArrowUpRight} />
          <SummaryCard label="Total Expenses" value={money(s?.totalExpenses)} tone="expense" icon={ArrowDownRight} />
        </div>
        <Card className="graph-card p-6">
          <div className="graph-header"><div><h2>Expense Overview</h2><span>Last 7 days</span></div><CalendarDays className="h-5 w-5 text-[#777e94]" /></div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sevenDay.data ?? []} barCategoryGap="22%">
                <CartesianGrid stroke="#292f42" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#777e94", fontSize: 11 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#171c2c", border: "1px solid #303649", borderRadius: 10, color: "#fff" }} formatter={(value: number) => [money(value), "Expenses"]} />
                <Bar dataKey="amount" radius={[8, 8, 3, 3]} fill="url(#barGradient)" />
                <defs><linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00cec9" /><stop offset="100%" stopColor="#6c5ce7" /></linearGradient></defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="analytics-card p-6">
          <div className="graph-header"><div><h2>Expense by Category</h2><span>{monthLabel(month)}</span></div><Link href="/analytics" className="text-xs text-[#a79cff]">View analytics <ChevronRight className="inline h-3 w-3" /></Link></div>
          <div className="grid items-center gap-3 sm:grid-cols-[170px_1fr]">
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryBreakdown.data ?? []} dataKey="amount" nameKey="category" innerRadius={52} outerRadius={72} paddingAngle={4}>{(categoryBreakdown.data ?? []).map((item, index) => <Cell key={item.category} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip contentStyle={{ background: "#171c2c", border: "1px solid #303649", borderRadius: 10 }} formatter={(value: number) => money(value)} /></PieChart></ResponsiveContainer>
            </div>
            <div className="space-y-3">{(categoryBreakdown.data ?? []).slice(0, 5).map((item, index) => <div key={item.category} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.category}</span><span className="font-mono text-xs text-[#858ba1]">{item.percentage.toFixed(0)}%</span></div>)}{!(categoryBreakdown.data ?? []).length && <p className="text-sm text-[#777e94]">Your categories will appear as you add transactions.</p>}</div>
          </div>
        </Card>
        <Card className="transactions-card p-6">
          <div className="transaction-header"><div><h2>Recent Transactions</h2><span>Your latest money moves</span></div><Link href="/transactions" className="text-xs text-[#a79cff]">View all <ChevronRight className="inline h-3 w-3" /></Link></div>
          <TransactionList rows={recent.data ?? []} onEdit={(row) => { setEditing(row); setFormOpen(false); }} />
        </Card>
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="dark-dialog"><TransactionForm onSaved={() => setFormOpen(false)} /></DialogContent></Dialog>
    </div>
  );
}

function TransactionList({ rows, onEdit, onDelete }: { rows: Transaction[]; onEdit: (row: Transaction) => void; onDelete?: (row: Transaction) => void }) {
  if (!rows.length) return <div className="empty-state"><WalletCards className="mx-auto mb-3 h-8 w-8 text-[#6c5ce7]" /><p>No transactions yet.</p><span>Start with one small entry.</span></div>;
  return <div>{rows.map((row) => <div key={row.id} className="transaction-row"><div className="transaction-left"><div className="transaction-icon"><CategoryIcon category={row.category} /></div><div className="min-w-0"><div className="truncate text-sm font-bold">{row.description}</div><div className="mt-1 truncate text-[11px] text-[#72798e]">{row.category} · {dateLabel(row.date)}</div></div></div><div className="transaction-right"><div className={`amount ${row.type}`}>{row.type === "income" ? "+" : "−"}{money(row.amount)}</div><div className="action-buttons"><button aria-label={`Edit ${row.description}`} onClick={() => onEdit(row)} className="edit-btn"><Pencil className="h-3.5 w-3.5" /></button>{onDelete && <button aria-label={`Delete ${row.description}`} onClick={() => onDelete(row)} className="delete-btn"><Trash2 className="h-3.5 w-3.5" /></button>}</div></div></div>)}</div>;
}

function TransactionsPage() {
  const [type, setType] = useState<"all" | TransactionType>("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const categories = useListCategories();
  const rows = useListExpenses({ month, ...(type !== "all" ? { type } : {}), ...(category !== "all" ? { category } : {}), ...(search ? { search } : {}) });
  const options = categories.data ?? [];
  return <div className="page-wrap"><PageHeader eyebrow="Your money moves" title="Recent Transactions" description="Everything in one place, with enough detail to make your next decision easier." action={<button className="gradient-button" onClick={() => setEditing({} as Transaction)}><Plus className="h-4 w-4" /> Add transaction</button>} /><Card className="overflow-hidden"><div className="filter-bar"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#62697e]" /><input className="dark-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" /></div><select className="dark-input sm:max-w-[140px]" value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select><select className="dark-input sm:max-w-[150px]" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{options.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><input className="dark-input sm:max-w-[150px]" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>{rows.isLoading ? <div className="empty-state">Loading your transactions…</div> : rows.isError ? <div className="empty-state text-[#ff7675]">Could not load transactions. Try refreshing.</div> : <TransactionList rows={rows.data ?? []} onEdit={setEditing} onDelete={setDeleting} />}</Card>{editing && <Dialog open onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="dark-dialog"><TransactionForm editing={editing.id ? editing : null} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} /></DialogContent></Dialog>}{deleting && <ConfirmDelete transaction={deleting} onClose={() => setDeleting(null)} />}</div>;
}

function BudgetsPage() {
  const month = currentMonth();
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const categories = useListCategories();
  const budgets = useListBudgets({ month });
  const create = useCreateBudget();
  const remove = useDeleteBudget();
  const options = categories.data?.filter((item) => item.type === "expense") ?? [];
  const save = (event: FormEvent): void => {
    event.preventDefault();
    const numeric = Number(amount);
    if (!numeric || numeric <= 0) {
      toast.error("Enter a budget greater than zero.");
      return;
    }
    create.mutate({ data: { category, amount: numeric, month: Number(month.slice(5)), year: Number(month.slice(0, 4)) } }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ month }) }); void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({ month }) }); setAmount(""); toast.success("Budget saved successfully"); }, onError: () => toast.error("Could not save budget.") });
  };
  return <div className="page-wrap"><PageHeader eyebrow={monthLabel(month)} title="Budgets that guide, not judge." description="Give the month a little shape. You can change these numbers whenever your life changes." /><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><Card className="p-6"><div className="mb-6"><div className="section-kicker">Set a limit</div><h2 className="mt-2 text-[20px] font-bold">Monthly category budget</h2></div><form onSubmit={save} className="space-y-4"><label className="input-label">Category<select className="dark-input mt-2" value={category} onChange={(e) => setCategory(e.target.value)}>{(options.length ? options : defaultCategoryNames.filter((name) => name !== "Salary").map((name, id) => ({ id, name, type: "expense" } as Category))).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><label className="input-label">Budget amount<div className="relative mt-2"><DollarSign className="absolute left-3 top-3 h-4 w-4 text-[#777e94]" /><input className="dark-input pl-9" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹ 3,000" /></div></label><button className="gradient-button w-full" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save budget"}</button></form></Card><Card className="p-6"><div className="mb-6 flex items-center justify-between"><div><div className="section-kicker">This month</div><h2 className="mt-2 text-[20px] font-bold">Budget progress</h2></div><Link href="/analytics" className="text-xs text-[#a79cff]">See insights <ChevronRight className="inline h-3 w-3" /></Link></div>{budgets.isLoading ? <div className="empty-state">Loading budgets…</div> : budgets.data?.length ? <div className="space-y-5">{budgets.data.map((budget) => { const warning = budget.usedPercent >= 80; return <div key={budget.id}><div className="mb-2 flex justify-between text-sm"><span className="flex items-center gap-2"><CategoryIcon category={budget.category} />{budget.category}</span><span className="font-mono text-xs text-[#858ba1]">{money(budget.spent)} / {money(budget.amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#292f42]"><div className={`h-full rounded-full ${budget.usedPercent >= 100 ? "bg-[#ff7675]" : warning ? "bg-[#f6c85f]" : "bg-[#00cec9]"}`} style={{ width: `${Math.min(budget.usedPercent, 100)}%` }} /></div><div className={`mt-1 text-right text-[11px] ${warning ? "text-[#f6c85f]" : "text-[#777e94]"}`}>{budget.usedPercent.toFixed(0)}% used {budget.usedPercent >= 100 ? "· over budget" : warning ? "· getting close" : ""}<button className="ml-3 text-[#777e94] hover:text-[#ff7675]" onClick={() => remove.mutate({ id: budget.id }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ month }) }); toast.success("Budget removed"); } })}><Trash2 className="inline h-3 w-3" /></button></div></div>; })}</div> : <div className="empty-state"><WalletCards className="mx-auto mb-3 h-8 w-8 text-[#6c5ce7]" /><p>No budgets yet.</p><span>Add one to see progress and warnings.</span></div>}</Card></div></div>;
}

function AnalyticsPage() {
  const categories = useGetCategoryBreakdown({ month: currentMonth() });
  const monthly = useGetMonthlyTrend({ months: 6 });
  const compare = useGetIncomeExpenseTrend({ months: 6 });
  return <div className="page-wrap"><PageHeader eyebrow="Your patterns" title="Analytics without the anxiety." description="A few useful angles on your money, so you can notice patterns before they become problems." /><div className="analytics-grid"><Card className="p-6 lg:col-span-2"><div className="graph-header"><div><h2>Monthly Expense Trend</h2><span>Last 6 months</span></div><TrendingDown className="h-5 w-5 text-[#ff7675]" /></div><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly.data ?? []}><defs><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6c5ce7" stopOpacity=".55" /><stop offset="100%" stopColor="#6c5ce7" stopOpacity=".03" /></linearGradient></defs><CartesianGrid stroke="#292f42" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#777e94", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#777e94", fontSize: 11 }} tickFormatter={(value) => `₹${value}`} /><Tooltip contentStyle={{ background: "#171c2c", border: "1px solid #303649", borderRadius: 10 }} formatter={(value: number) => [money(value), "Expenses"]} /><Area type="monotone" dataKey="amount" stroke="#8e7dff" fill="url(#expenseFill)" strokeWidth={3} /></AreaChart></ResponsiveContainer></div></Card><Card className="p-6"><div className="graph-header"><div><h2>Category share</h2><span>This month</span></div><Tag className="h-5 w-5 text-[#a79cff]" /></div><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories.data ?? []} dataKey="amount" nameKey="category" innerRadius={58} outerRadius={85} paddingAngle={4}>{(categories.data ?? []).map((item, index) => <Cell key={item.category} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip contentStyle={{ background: "#171c2c", border: "1px solid #303649", borderRadius: 10 }} formatter={(value: number) => money(value)} /></PieChart></ResponsiveContainer></div></Card><Card className="p-6 lg:col-span-3"><div className="graph-header"><div><h2>Income vs Expense</h2><span>Last 6 months</span></div><div className="flex gap-4 text-xs"><span className="text-[#00cec9]">● Income</span><span className="text-[#ff7675]">● Expenses</span></div></div><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={compare.data ?? []} barGap={4}><CartesianGrid stroke="#292f42" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#777e94", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#777e94", fontSize: 11 }} tickFormatter={(value) => `₹${value}`} /><Tooltip contentStyle={{ background: "#171c2c", border: "1px solid #303649", borderRadius: 10 }} formatter={(value: number) => money(value)} /><Bar dataKey="income" fill="#00cec9" radius={[5, 5, 0, 0]} /><Bar dataKey="expense" fill="#ff7675" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Card></div></div>;
}

function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [name, setName] = useState("");
  useEffect(() => { if (user) setName(user.firstName ?? ""); }, [user]);
  if (!isLoaded || !user) return <div className="page-wrap"><div className="empty-state">Loading profile…</div></div>;
  const saveName = async (event: FormEvent) => { event.preventDefault(); try { await user.update({ firstName: name }); toast.success("Profile updated"); } catch { toast.error("Could not update your profile"); } };
  return <div className="page-wrap max-w-[900px]"><PageHeader eyebrow="Your account" title="A space that belongs to you." description="Keep your account details close and your financial data private." /><div className="grid gap-5 md:grid-cols-[.8fr_1.2fr]"><Card className="flex flex-col items-center justify-center p-8 text-center"><div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] text-4xl font-bold text-[#080b14]">{(user.firstName?.[0] ?? user.emailAddresses[0]?.emailAddress[0] ?? "U").toUpperCase()}</div><h2 className="mt-5 text-xl font-bold">{user.fullName || "ExpenseFlow user"}</h2><p className="mt-1 text-sm text-[#858ba1]">{user.emailAddresses[0]?.emailAddress}</p><button className="danger-button mt-7" onClick={() => void signOut({ redirectUrl: basePath || "/" })}><LogOut className="h-4 w-4" /> Log out</button></Card><Card className="p-7"><div className="section-kicker">Profile details</div><h2 className="mt-2 text-xl font-bold">Your information</h2><form onSubmit={saveName} className="mt-7 space-y-5"><label className="input-label">Name<input className="dark-input mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label><label className="input-label">Email<input className="dark-input mt-2 opacity-60" value={user.emailAddresses[0]?.emailAddress ?? ""} readOnly /></label><div className="rounded-xl border border-[#292f42] bg-[#101421] p-4 text-xs leading-relaxed text-[#858ba1]">Your account was created on {user.createdAt ? dateLabel(user.createdAt.toISOString().slice(0, 10)) : "your sign-up date"}. Authentication is handled securely by Clerk.</div><button className="gradient-button" type="submit">Save changes</button></form></Card></div></div>;
}

function DashboardRoute() { return <Protected><Shell><Dashboard /></Shell></Protected>; }
function TransactionsRoute() { return <Protected><Shell><TransactionsPage /></Shell></Protected>; }
function BudgetsRoute() { return <Protected><Shell><BudgetsPage /></Shell></Protected>; }
function AnalyticsRoute() { return <Protected><Shell><AnalyticsPage /></Shell></Protected>; }
function ProfileRoute() { return <Protected><Shell><ProfilePage /></Shell></Protected>; }

function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <>{children}</>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  useEffect(() => addListener(() => client.clear()), [addListener, client]);
  return null;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) => (basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path);
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={{
    theme: shadcn,
    cssLayerName: "clerk",
    options: { logoPlacement: "inside", logoLinkUrl: basePath || "/", logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
    variables: { colorPrimary: "#7567ee", colorForeground: "#ffffff", colorMutedForeground: "#858ba1", colorDanger: "#ff7675", colorBackground: "#141826", colorInput: "#101421", colorInputForeground: "#ffffff", colorNeutral: "#303649", fontFamily: "Arial, sans-serif", borderRadius: "0.75rem" },
    elements: { rootBox: "w-full flex justify-center", cardBox: "bg-[#141826] border border-[#303649] rounded-2xl w-[420px] max-w-full overflow-hidden", card: "!shadow-none !border-0 !bg-transparent", footer: "!shadow-none !border-0 !bg-transparent", headerTitle: "!text-white", headerSubtitle: "!text-[#858ba1]", formFieldLabel: "!text-[#999fb5]", formFieldInput: "!bg-[#101421] !border-[#292f42] !text-white", formButtonPrimary: "!bg-[#6c5ce7] hover:!bg-[#7567ee]", footerActionLink: "!text-[#a79cff]", footerActionText: "!text-[#858ba1]", dividerText: "!text-[#858ba1]", socialButtonsBlockButton: "!bg-[#101421] !border-[#303649] !text-white", socialButtonsBlockButtonText: "!text-white", alert: "!bg-[#3b1e28] !border-[#ff7675]", alertText: "!text-[#ffb1b0]" },
  }} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: "Welcome Back", subtitle: "Login to manage your expenses" } }, signUp: { start: { title: "Create your account", subtitle: "Start managing your money with ExpenseFlow" } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <Switch>
        <Route path="/" component={RootRoute} />
        <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} />
        <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} />
        <Route path="/dashboard" component={DashboardRoute} />
        <Route path="/transactions" component={TransactionsRoute} />
        <Route path="/budgets" component={BudgetsRoute} />
        <Route path="/analytics" component={AnalyticsRoute} />
        <Route path="/profile" component={ProfileRoute} />
        <Route component={NotFound} />
      </Switch>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
  return <WouterRouter base={basePath}><ClerkRoutes /><Toaster theme="dark" position="bottom-right" /></WouterRouter>;
}

export default App;