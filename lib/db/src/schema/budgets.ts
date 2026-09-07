import { createInsertSchema } from "drizzle-zod";
import {
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const budgetsTable = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    amount: doublePrecision("amount").notNull(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("budgets_user_month_idx").on(table.userId, table.year, table.month),
  ],
);

export const insertBudgetSchema = createInsertSchema(budgetsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetsTable.$inferSelect;