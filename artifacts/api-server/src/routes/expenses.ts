import { and, desc, eq, gte, ilike, lt, lte, or, type SQL } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, expensesTable } from "@workspace/db";
import {
  CreateExpenseBody,
  CreateExpenseResponse,
  DeleteExpenseParams,
  ListExpensesQueryParams,
  ListExpensesResponse,
  ListRecentExpensesQueryParams,
  ListRecentExpensesResponse,
  UpdateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseResponse,
} from "@workspace/api-zod";
import { currentUserId } from "../middlewares/auth";
import { monthBounds } from "../lib/finance";

const router: IRouter = Router();

function withUser(req: Parameters<NonNullable<Parameters<IRouter["get"]>[1]>>[0]) {
  return currentUserId(req);
}

router.get("/expenses", async (req, res): Promise<void> => {
  const parsed = ListExpensesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = withUser(req);
  const filters: SQL[] = [eq(expensesTable.userId, userId)];
  if (parsed.data.from) filters.push(gte(expensesTable.date, parsed.data.from));
  if (parsed.data.to) filters.push(lte(expensesTable.date, parsed.data.to));
  if (parsed.data.month) {
    const bounds = monthBounds(parsed.data.month);
    filters.push(gte(expensesTable.date, bounds.start));
    filters.push(lt(expensesTable.date, bounds.nextStart));
  }
  if (parsed.data.category) {
    filters.push(eq(expensesTable.category, parsed.data.category));
  }
  if (parsed.data.type) filters.push(eq(expensesTable.type, parsed.data.type));
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
    .where(and(...filters))
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
    .values({
      userId: withUser(req),
      amount: parsed.data.amount,
      description: parsed.data.description,
      merchant: parsed.data.merchant || "Personal",
      type: parsed.data.type,
      category: parsed.data.category,
      date: parsed.data.date,
      paymentMethod: parsed.data.paymentMethod || "Card",
      notes: parsed.data.notes ?? null,
    })
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
    .where(eq(expensesTable.userId, withUser(req)))
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
    .where(
      and(
        eq(expensesTable.id, params.data.id),
        eq(expensesTable.userId, withUser(req)),
      ),
    )
    .returning();
  if (!expense) {
    res.status(404).json({ error: "Transaction not found" });
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
    .where(
      and(
        eq(expensesTable.id, params.data.id),
        eq(expensesTable.userId, withUser(req)),
      ),
    )
    .returning({ id: expensesTable.id });
  if (!expense) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.status(204).send();
});

export default router;