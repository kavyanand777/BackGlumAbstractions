import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import {
  CreateCategoryBody,
  CreateCategoryResponse,
  ListCategoriesResponse,
} from "@workspace/api-zod";
import { currentUserId } from "../middlewares/auth";
import { defaultCategories } from "../lib/finance";

const router: IRouter = Router();

async function ensureCategories(userId: string) {
  const existing = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId));
  if (existing.length > 0) return existing;
  await db.insert(categoriesTable).values(
    defaultCategories.map((category) => ({ ...category, userId })),
  );
  return db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId));
}

router.get("/categories", async (req, res): Promise<void> => {
  res.json(ListCategoriesResponse.parse(await ensureCategories(currentUserId(req))));
});

router.post("/categories", async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [category] = await db
    .insert(categoriesTable)
    .values({ ...parsed.data, userId: currentUserId(req) })
    .returning();
  res.status(201).json(CreateCategoryResponse.parse(category));
});

export default router;