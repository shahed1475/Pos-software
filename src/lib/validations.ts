import { z } from "zod"

// ---- Orders ----
export const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  variant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const createOrderSchema = z.object({
  type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
  tableId: z.string().optional().nullable(),
  staffId: z.string().min(1),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddr: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1),
  discount: z.number().min(0).optional(),
  discountType: z.enum(["PERCENTAGE", "FLAT"]).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateOrderSchema = z.object({
  status: z.enum(["NEW", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddr: z.string().optional().nullable(),
  itemUpdates: z.array(z.object({
    id: z.string().min(1),
    status: z.enum(["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"]),
  })).optional(),
})

// ---- Menu ----
export const createMenuItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  price: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().min(0)),
  image: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  available: z.boolean().optional().default(true),
  variants: z.array(z.object({
    name: z.string().min(1),
    priceAdj: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v)) || 0).optional(),
  })).optional(),
})

export const updateMenuItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  price: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().min(0)).optional(),
  image: z.string().optional().nullable(),
  categoryId: z.string().min(1).optional(),
  available: z.boolean().optional(),
  variants: z.array(z.object({
    name: z.string().min(1),
    priceAdj: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v)) || 0).optional(),
  })).optional(),
})

// ---- Categories ----
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
})

export const updateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
})

// ---- Staff ----
export const createStaffSchema = z.object({
  name: z.string().min(1).max(200),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN"]).optional().default("CASHIER"),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  active: z.boolean().optional().default(true),
})

export const updateStaffSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits").optional(),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN"]).optional(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  active: z.boolean().optional(),
})

// ---- Inventory ----
export const createIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(50),
  stock: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v)) || 0).optional(),
  minStock: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v)) || 0).optional(),
  costPerUnit: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v)) || 0).optional(),
})

export const purchaseSchema = z.object({
  type: z.literal("purchase"),
  ingredientId: z.string().min(1),
  quantity: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().positive()),
  totalCost: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().min(0)),
  supplier: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export const updateIngredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  unit: z.string().min(1).max(50).optional(),
  stock: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).optional(),
  minStock: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).optional(),
  costPerUnit: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).optional(),
})

// ---- Billing ----
export const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(["CASH", "CARD", "MOBILE", "OTHER"]),
  amount: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().positive()),
})

// ---- Tables ----
export const createTableSchema = z.object({
  number: z.union([z.string(), z.number()]).transform((v) => parseInt(String(v))).pipe(z.number().int().positive()),
  capacity: z.union([z.string(), z.number()]).transform((v) => parseInt(String(v)) || 4).optional(),
  posX: z.number().int().optional().default(0),
  posY: z.number().int().optional().default(0),
})

export const updateTableSchema = z.object({
  number: z.union([z.string(), z.number()]).transform((v) => parseInt(String(v))).pipe(z.number().int().positive()).optional(),
  capacity: z.union([z.string(), z.number()]).transform((v) => parseInt(String(v))).optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"]).optional(),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
})

// ---- Settings ----
export const updateSettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  taxRate: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().min(0).max(100)).optional(),
  currency: z.string().min(1).max(10).optional(),
})

// ---- Expenses (Milestone 5) ----
export const createExpenseSchema = z.object({
  category: z.enum(["RENT", "UTILITIES", "SALARIES", "SUPPLIES", "MARKETING", "MAINTENANCE", "OTHER"]),
  amount: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().positive()),
  date: z.string().or(z.date()).transform((v) => new Date(v)),
  notes: z.string().max(1000).optional().nullable(),
  staffId: z.string().optional(),
})

// ---- Waste (Milestone 3) ----
export const createWasteSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().positive()),
  reason: z.string().min(1).max(500),
})

// ---- Recipe (Milestone 4) ----
export const updateRecipeSchema = z.object({
  ingredients: z.array(z.object({
    ingredientId: z.string().min(1),
    quantity: z.number().positive(),
  })),
})

// ---- Analytics ----
export const aggregationRequestSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  types: z.array(z.enum(["daily-sales", "hourly-sales", "inventory"])).optional(),
})

export const summaryQuerySchema = z.object({
  type: z.enum(["daily", "hourly", "inventory"]),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
})

export const predictionQuerySchema = z.object({
  type: z.enum(["peak-hours", "sales-forecast", "reorder"]),
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
})

// ---- Vendors ----
export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(1000).optional().nullable(),
  logo: z.string().optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  commissionRate: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v)) || 0).optional(),
  branchId: z.string().optional().nullable(),
})

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(1000).optional().nullable(),
  logo: z.string().optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  commissionRate: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).optional(),
  active: z.boolean().optional(),
  kycStatus: z.enum(["PENDING", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
  kycFields: z.string().optional().nullable(),
})

export const vendorStaffSchema = z.object({
  staffId: z.string().min(1),
  role: z.enum(["VENDOR_ADMIN", "VENDOR_MANAGER", "VENDOR_STAFF"]).optional().default("VENDOR_STAFF"),
})

// ---- Cart ----
export const addCartItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  variant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0),
})

export const checkoutCartSchema = z.object({
  type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
  staffId: z.string().min(1),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddr: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ---- Settlement ----
export const createCommissionRuleSchema = z.object({
  vendorId: z.string().optional().nullable(),
  type: z.enum(["PERCENTAGE", "FLAT", "TIERED"]).default("PERCENTAGE"),
  value: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().min(0)),
  minOrder: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).optional().nullable(),
  channel: z.string().optional().nullable(),
})

export const createRentAgreementSchema = z.object({
  vendorId: z.string().min(1),
  type: z.enum(["FIXED", "REVENUE_SHARE", "HYBRID"]).default("FIXED"),
  fixedAmount: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).optional().nullable(),
  sharePercentage: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).optional().nullable(),
  billingCycle: z.enum(["WEEKLY", "MONTHLY"]).default("MONTHLY"),
})

export const createPayoutSchema = z.object({
  vendorId: z.string().min(1),
  amount: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))).pipe(z.number().positive()),
  period: z.string().min(1),
})

// Helper to handle Zod errors in API routes
export function formatZodError(error: z.ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }))
}
