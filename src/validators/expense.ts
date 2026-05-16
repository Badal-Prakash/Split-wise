import { z } from "zod";
export const expenseSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  paidBy: z.string(),
  payers: z.array(z.object({ userId: z.string(), amount: z.number().positive() })).optional(),
  splitBetween: z.array(z.object({
    userId: z.string(),
    amount: z.number().optional(),
    percentage: z.number().optional(),
    shares: z.number().optional(),
    adjustment: z.number().optional(),
    excluded: z.boolean().optional()
  })).min(1),
  splitType: z.enum(["equal","exact","percentage","shares","unequal","adjustment"]),
  groupId: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  attachments: z.array(z.string()).default([]),
  date: z.coerce.date().optional(),
  recurring: z.object({
    enabled: z.boolean().default(false),
    cadence: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]).optional(),
    interval: z.number().int().positive().optional(),
    nextRunAt: z.coerce.date().optional()
  }).optional()
});
