import { and, desc, eq, gte, ilike, lt, lte, or, type SQL } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, expensesTable } from "@workspace/db";
import {
  CreateExpenseBody,
  CreateExpenseResponse,
  DeleteExpenseParams,
  GetCategoryBreakdownQueryParams,
  GetCategoryBreakdownResponse,
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
  GetMonthlyTrendQueryParams,
  GetMonthlyTrendResponse,
  ListCategoriesResponse,
  ListExpensesQueryParams,
  ListExpensesResponse,
  ListRecentExpensesQueryParams,
  ListRecentExpensesResponse,
  UpdateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const budget = 50000;

const categories = [
  { name: "Food", color: "#E07A5F", icon: "Utensils" },
  { name: "Transport", color: "#3D8B8B", icon: "Car" },
  { name: "Shopping", color: "#8C6BB1", icon: "ShoppingBag" },
  { name: "Bills", color: "#D89B3C", icon: "Receipt" },
  { name: "Entertainment", color: "#D05A7A", icon: "Clapperboard" },
  { name: "Health", color: "#4E9B6F", icon: "HeartPulse" },
  { name: "Travel", color: "#4D7EA8", icon: "Plane" },
  { name: "Other", color: "#7B8494", icon: "MoreHorizontal" },
] as const;

type CategoryName = (typeof categories)[number]["name"];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatMonth(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function monthBounds(month: string): { start: string; nextStart: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextStartDate = new Date(Date.UTC(year, monthNumber, 1));
  return {
    start: `${month}-01`,
    nextStart: `${nextStartDate.getUTCFullYear()}-${String(
      nextStartDate.getUTCMonth() + 1,
    ).padStart(2, "0")}-01`,
  };
}

function previousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return formatMonth(date.getUTCFullYear(), date.getUTCMonth());
}

async function getExpensesForMonth(month: string) {
  const bounds = monthBounds(month);
  return db
    .select()
    .from(expensesTable)
    .where(
      and(
        gte(expensesTable.date, bounds.start),
        lt(expensesTable.date, bounds.nextStart),
      ),
    );
}

router.get("/expenses", async (req, res): Promise<void> => {
  const parsed = ListExpensesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters: SQL[] = [];
  if (parsed.data.from) {
    filters.push(gte(expensesTable.date, parsed.data.from));
  }
  if (parsed.data.to) {
    filters.push(lte(expensesTable.date, parsed.data.to));
  }
  if (parsed.data.category) {
    filters.push(eq(expensesTable.category, parsed.data.category));
  }
  if (parsed.data.search) {
    filters.push(
      or(
        ilike(expensesTable.description, `%${parsed.data.search}%`),
        ilike(expensesTable.merchant, `%${parsed.data.search}%`),
      ) as SQL,
    );
  }

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(expensesTable.date), desc(expensesTable.createdAt));

  res.json(ListExpensesResponse.parse(expenses));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db
    .insert(expensesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(CreateExpenseResponse.parse(expense));
});

router.get("/expenses/recent", async (req, res): Promise<void> => {
  const parsed = ListRecentExpensesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const expenses = await db
    .select()
    .from(expensesTable)
    .orderBy(desc(expensesTable.date), desc(expensesTable.createdAt))
    .limit(parsed.data.limit);

  res.json(ListRecentExpensesResponse.parse(expenses));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db
    .update(expensesTable)
    .set(parsed.data)
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(UpdateExpenseResponse.parse(expense));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db
    .delete(expensesTable)
    .where(eq(expensesTable.id, params.data.id))
    .returning({ id: expensesTable.id });

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const current = await getExpensesForMonth(parsed.data.month);
  const previous = await getExpensesForMonth(previousMonth(parsed.data.month));
  const totalSpent = current.reduce((sum, expense) => sum + expense.amount, 0);
  const previousTotal = previous.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const byCategory = new Map<string, number>();
  for (const expense of current) {
    byCategory.set(
      expense.category,
      (byCategory.get(expense.category) ?? 0) + expense.amount,
    );
  }
  const topCategory =
    [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const summary = {
    month: parsed.data.month,
    totalSpent: round(totalSpent),
    transactionCount: current.length,
    averageTransaction: round(current.length ? totalSpent / current.length : 0),
    budget,
    budgetUsedPercent: round((totalSpent / budget) * 100),
    changeFromPreviousMonth: round(
      previousTotal === 0
        ? totalSpent > 0
          ? 100
          : 0
        : ((totalSpent - previousTotal) / previousTotal) * 100,
    ),
    topCategory: topCategory as CategoryName | null,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/category-breakdown", async (req, res): Promise<void> => {
  const parsed = GetCategoryBreakdownQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const expenses = await getExpensesForMonth(parsed.data.month);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const grouped = new Map<
    string,
    { amount: number; transactionCount: number }
  >();

  for (const expense of expenses) {
    const existing = grouped.get(expense.category) ?? {
      amount: 0,
      transactionCount: 0,
    };
    existing.amount += expense.amount;
    existing.transactionCount += 1;
    grouped.set(expense.category, existing);
  }

  const breakdown = [...grouped.entries()]
    .map(([category, values]) => ({
      category: category as CategoryName,
      amount: round(values.amount),
      percentage: round(total ? (values.amount / total) * 100 : 0),
      transactionCount: values.transactionCount,
    }))
    .sort((a, b) => b.amount - a.amount);

  res.json(GetCategoryBreakdownResponse.parse(breakdown));
});

router.get("/dashboard/monthly-trend", async (req, res): Promise<void> => {
  const parsed = GetMonthlyTrendQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date();
  const firstMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - parsed.data.months + 1, 1),
  );
  const firstMonthName = formatMonth(
    firstMonth.getUTCFullYear(),
    firstMonth.getUTCMonth(),
  );
  const expenses = await db
    .select()
    .from(expensesTable)
    .where(gte(expensesTable.date, monthBounds(firstMonthName).start));
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const month = expense.date.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + expense.amount);
  }
  const labelFormatter = new Intl.DateTimeFormat("en-IN", { month: "short" });
  const trend = Array.from({ length: parsed.data.months }, (_, index) => {
    const date = new Date(
      Date.UTC(
        firstMonth.getUTCFullYear(),
        firstMonth.getUTCMonth() + index,
        1,
      ),
    );
    const month = formatMonth(date.getUTCFullYear(), date.getUTCMonth());
    return {
      month,
      label: labelFormatter.format(date),
      amount: round(totals.get(month) ?? 0),
    };
  });

  res.json(GetMonthlyTrendResponse.parse(trend));
});

router.get("/categories", (_req, res): void => {
  res.json(ListCategoriesResponse.parse(categories));
});

export default router;