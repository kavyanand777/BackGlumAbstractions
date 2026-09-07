import { and, eq, gte, lt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, budgetsTable, expensesTable } from "@workspace/db";
import {
  GetCategoryBreakdownQueryParams,
  GetCategoryBreakdownResponse,
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
  GetIncomeExpenseTrendQueryParams,
  GetIncomeExpenseTrendResponse,
  GetMonthlyTrendQueryParams,
  GetMonthlyTrendResponse,
  GetSevenDayTrendQueryParams,
  GetSevenDayTrendResponse,
} from "@workspace/api-zod";
import { currentUserId } from "../middlewares/auth";
import { formatMonth, monthBounds, previousMonth, round } from "../lib/finance";

const router: IRouter = Router();

async function userExpenses(userId: string) {
  return db.select().from(expensesTable).where(eq(expensesTable.userId, userId));
}

function dateFromOffset(base: string, offset: number): string {
  const date = new Date(`${base}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = currentUserId(req);
  const all = await userExpenses(userId);
  const currentBounds = monthBounds(parsed.data.month);
  const current = all.filter(
    (row) => row.date >= currentBounds.start && row.date < currentBounds.nextStart,
  );
  const totalIncome = all
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + row.amount, 0);
  const totalExpenses = all
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + row.amount, 0);
  const monthlyExpenses = current
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + row.amount, 0);
  const [budgetRows] = await Promise.all([
    db
      .select()
      .from(budgetsTable)
      .where(
        and(
          eq(budgetsTable.userId, userId),
          eq(budgetsTable.month, Number(parsed.data.month.slice(5, 7))),
          eq(budgetsTable.year, Number(parsed.data.month.slice(0, 4))),
        ),
      ),
  ]);
  const budget = budgetRows.reduce((sum, row) => sum + row.amount, 0);
  res.json(
    GetDashboardSummaryResponse.parse({
      month: parsed.data.month,
      balance: round(totalIncome - totalExpenses),
      totalIncome: round(totalIncome),
      totalExpenses: round(totalExpenses),
      monthlyExpenses: round(monthlyExpenses),
      transactionCount: current.length,
      budget: round(budget),
      budgetUsedPercent: round(budget ? (monthlyExpenses / budget) * 100 : 0),
    }),
  );
});

router.get("/dashboard/category-breakdown", async (req, res): Promise<void> => {
  const parsed = GetCategoryBreakdownQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const bounds = monthBounds(parsed.data.month);
  const rows = await db
    .select()
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.userId, currentUserId(req)),
        eq(expensesTable.type, "expense"),
        gte(expensesTable.date, bounds.start),
        lt(expensesTable.date, bounds.nextStart),
      ),
    );
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const grouped = new Map<string, { amount: number; transactionCount: number }>();
  for (const row of rows) {
    const item = grouped.get(row.category) ?? { amount: 0, transactionCount: 0 };
    item.amount += row.amount;
    item.transactionCount += 1;
    grouped.set(row.category, item);
  }
  res.json(
    GetCategoryBreakdownResponse.parse(
      [...grouped.entries()]
        .map(([category, item]) => ({
          category,
          amount: round(item.amount),
          percentage: round(total ? (item.amount / total) * 100 : 0),
          transactionCount: item.transactionCount,
        }))
        .sort((a, b) => b.amount - a.amount),
    ),
  );
});

async function buildTrend(userId: string, months: number, includeIncome: boolean) {
  const now = new Date();
  const first = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1),
  );
  const firstMonth = formatMonth(first.getUTCFullYear(), first.getUTCMonth());
  const rows = (await userExpenses(userId)).filter(
    (row) => row.date >= monthBounds(firstMonth).start,
  );
  const totals = new Map<string, { income: number; expense: number }>();
  for (const row of rows) {
    const total = totals.get(row.date.slice(0, 7)) ?? { income: 0, expense: 0 };
    if (row.type === "income") total.income += row.amount;
    else total.expense += row.amount;
    totals.set(row.date.slice(0, 7), total);
  }
  const formatter = new Intl.DateTimeFormat("en-IN", { month: "short" });
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index, 1));
    const month = formatMonth(date.getUTCFullYear(), date.getUTCMonth());
    const total = totals.get(month) ?? { income: 0, expense: 0 };
    return includeIncome
      ? { month, label: formatter.format(date), income: round(total.income), expense: round(total.expense) }
      : { month, label: formatter.format(date), amount: round(total.expense) };
  });
}

router.get("/dashboard/monthly-trend", async (req, res): Promise<void> => {
  const parsed = GetMonthlyTrendQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(
    GetMonthlyTrendResponse.parse(
      await buildTrend(currentUserId(req), parsed.data.months, false),
    ),
  );
});

router.get("/dashboard/income-expense", async (req, res): Promise<void> => {
  const parsed = GetIncomeExpenseTrendQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(
    GetIncomeExpenseTrendResponse.parse(
      await buildTrend(currentUserId(req), parsed.data.months, true),
    ),
  );
});

router.get("/dashboard/seven-day", async (req, res): Promise<void> => {
  const parsed = GetSevenDayTrendQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const endDate = parsed.data.endDate ?? new Date().toISOString().slice(0, 10);
  const startDate = dateFromOffset(endDate, -6);
  const rows = (await userExpenses(currentUserId(req))).filter(
    (row) => row.type === "expense" && row.date >= startDate && row.date <= endDate,
  );
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.date, (totals.get(row.date) ?? 0) + row.amount);
  const formatter = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
  const points = Array.from({ length: 7 }, (_, index) => {
    const date = dateFromOffset(startDate, index);
    return {
      date,
      label: formatter.format(new Date(`${date}T12:00:00Z`)),
      amount: round(totals.get(date) ?? 0),
    };
  });
  res.json(GetSevenDayTrendResponse.parse(points));
});

export default router;