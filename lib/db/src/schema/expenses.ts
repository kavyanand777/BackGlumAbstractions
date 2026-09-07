import { createInsertSchema } from "drizzle-zod";
import {
  date,
  doublePrecision,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull(),
  merchant: text("merchant").notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  paymentMethod: varchar("payment_method", { length: 32 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;