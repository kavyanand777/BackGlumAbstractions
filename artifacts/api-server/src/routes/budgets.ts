import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, budgetsTable, expensesTable } from "@workspace/db";
import {
  CreateBudgetBody,
  CreateBudgetResponse,
  DeleteBudgetParams,
  ListBudgetsQueryParams,
  ListBudgetsResponse,
  UpdateBudgetBody,
  UpdateBudgetParams,
  UpdateBudgetResponse,
} from "@workspace/api-zod";
import { currentUserId } from "../middlewares/auth";
import { monthBounds, round } from "../lib/finance";

const router: IRouter = Router();

async function budgetRows(userId: string, month: string) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const rows = await db
    .select()
    .from(budgetsTable)
    .where(
      and(
        eq(budgetsTable.userId, userId),
        eq(budgetsTable.year, year),
        eq(budgetsTable.month, monthNumber),
      ),
    );
  const bounds = monthBounds(month);
  const expenses = await db
    .select()
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.userId, userId),
        eq(expensesTable.type, "expense"),
      ),
    );
  return rows.map((row) => {
    const spent = expenses
      .filter(
        (expense) =>
          expense.category === row.category &&
          expense.date >= bounds.start &&
          expense.date < bounds.nextStart,
      )
      .reduce((sum, expense) => sum + expense.amount, 0);
    return {
      ...row,
      spent: round(spent),
      usedPercent: round((spent / row.amount) * 100),
    };
  });
}

router.get("/budgets", async (req, res): Promise<void> => {
  const parsed = ListBudgetsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(
    ListBudgetsResponse.parse(
      await budgetRows(currentUserId(req), parsed.data.month),
    ),
  );
});

router.post("/budgets", async (req, res): Promise<void> => {
  const parsed = CreateBudgetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = currentUserId(req);
  const existing = await db
    .select()
    .from(budgetsTable)
    .where(
      and(
        eq(budgetsTable.userId, userId),
        eq(budgetsTable.category, parsed.data.category),
        eq(budgetsTable.month, parsed.data.month),
        eq(budgetsTable.year, parsed.data.year),
      ),
    );
  const [budget] =
    existing[0]
      ? await db
          .update(budgetsTable)
          .set({ amount: parsed.data.amount })
          .where(eq(budgetsTable.id, existing[0].id))
          .returning()
      : await db
          .insert(budgetsTable)
          .values({ ...parsed.data, userId })
          .returning();
  const [withUsage] = await budgetRows(
    userId,
    `${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}`,
  );
  res.status(201).json(CreateBudgetResponse.parse(withUsage ?? budget));
});

router.patch("/budgets/:id", async (req, res): Promise<void> => {
  const params = UpdateBudgetParams.safeParse(req.params);
  const parsed = UpdateBudgetBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid budget update" });
    return;
  }
  const [budget] = await db
    .update(budgetsTable)
    .set(parsed.data)
    .where(
      and(
        eq(budgetsTable.id, params.data.id),
        eq(budgetsTable.userId, currentUserId(req)),
      ),
    )
    .returning();
  if (!budget) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  const [withUsage] = await budgetRows(
    currentUserId(req),
    `${budget.year}-${String(budget.month).padStart(2, "0")}`,
  );
  res.json(UpdateBudgetResponse.parse(withUsage ?? budget));
});

router.delete("/budgets/:id", async (req, res): Promise<void> => {
  const params = DeleteBudgetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [budget] = await db
    .delete(budgetsTable)
    .where(
      and(
        eq(budgetsTable.id, params.data.id),
        eq(budgetsTable.userId, currentUserId(req)),
      ),
    )
    .returning({ id: budgetsTable.id });
  if (!budget) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  res.status(204).send();
});

export default router;