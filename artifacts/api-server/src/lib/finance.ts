export const defaultCategories = [
  { name: "Food", icon: "Utensils", type: "expense" },
  { name: "Travel", icon: "Plane", type: "expense" },
  { name: "Shopping", icon: "ShoppingBag", type: "expense" },
  { name: "Bills", icon: "Receipt", type: "expense" },
  { name: "Education", icon: "GraduationCap", type: "expense" },
  { name: "Entertainment", icon: "Clapperboard", type: "expense" },
  { name: "Salary", icon: "BriefcaseBusiness", type: "income" },
  { name: "Transport", icon: "Car", type: "expense" },
  { name: "Health", icon: "HeartPulse", type: "expense" },
  { name: "Other", icon: "Tag", type: "expense" },
] as const;

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMonth(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function monthBounds(month: string): {
  start: string;
  nextStart: string;
} {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextStartDate = new Date(Date.UTC(year, monthNumber, 1));
  return {
    start: `${month}-01`,
    nextStart: `${nextStartDate.getUTCFullYear()}-${String(
      nextStartDate.getUTCMonth() + 1,
    ).padStart(2, "0")}-01`,
  };
}

export function previousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return formatMonth(date.getUTCFullYear(), date.getUTCMonth());
}