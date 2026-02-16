# FluxPOS / AI-POS — Master Development Roadmap
## Multi-Vendor Market Focus — Final Plan

This is the analyzed and annotated master plan. Each stage shows current status and what needs to be built.

---

## Current Codebase Inventory (as of now)

- **23 Prisma models** (Tenant, Branch, Staff, Shift, Category, MenuItem, MenuVariant, Table, Order, OrderItem, Payment, Ingredient, ItemIngredient, Purchase, InventoryLog, Waste, Expense, DailySalesSummary, HourlySalesSummary, InventorySummary, AggregationJob, AuditLog)
- **27 API routes** covering auth, orders, menu, inventory, tables, staff, reports, billing, expenses, audit, aggregation, predictions, SSE, admin
- **15 dashboard pages** (home, orders, new order, menu, categories, kitchen, tables, inventory, purchases, logs, waste, staff, reports, analytics, settings)
- **42 components** across UI, layout, menu, orders, tables, kitchen, inventory, reports, analytics
- **SSE real-time** already implemented (orders + dashboard streams)
- **5 roles**: SUPER_ADMIN, ADMIN, MANAGER, CASHIER, WAITER, KITCHEN with 30+ permissions
- **Stack**: Next.js 14, Prisma 5 (SQLite), NextAuth (PIN login), Recharts, Radix UI, Tailwind, Zod, SWR

---

## STAGE 0 — Product Rules (Non-negotiables)

| Rule | Status |
|------|--------|
| Next.js 14 + TypeScript stack | DONE |
| Never send raw transactions to LLM; summary tables only | ENFORCED (summary tables exist) |
| Multi-tenant isolation in every query + API | DONE (tenantId + branchId scoping) |
| Everything auditable | DONE (AuditLog model + audit.ts) |
| Design for food hall / multi-merchant first | NOT YET — current design is single-restaurant |

---

## STAGE 1 — Core POS + Multi-Tenant Foundation

**STATUS: DONE**

| Feature | Status | Files |
|---------|--------|-------|
| Roles + permissions (SUPER_ADMIN to KITCHEN) | DONE | `src/lib/permissions.ts` |
| PIN login | DONE | `src/lib/auth.ts` (4-6 digit PIN) |
| Lockout policy | NEEDS CHECK — may need brute-force lockout |
| Branches + tables + staff | DONE | Models + API routes |
| Orders + order items + payments | DONE | Full CRUD + status flow |
| Discounts + taxes | DONE | Order model has discount, taxAmount fields |
| Service charge | NOT YET — no serviceCharge field |
| Dine-in / takeaway / delivery | DONE | Order.type enum |
| Audit logs + rate limiting + validation | DONE | AuditLog, middleware.ts, validations.ts |

**Gaps to fill before moving on:**
1. Add PIN lockout policy (max attempts + cooldown)
2. Add serviceCharge field to Order model (optional)

---

## STAGE 2 — Multi-Vendor Marketplace Core

**STATUS: NOT STARTED — This is the biggest new build**

### 2.1 Vendor Model + Vendor Ops

**New Prisma models needed:**
- `Vendor` — id, tenantId, branchId, name, slug, description, logo, contactName, contactPhone, contactEmail, commissionRate, active, kycStatus, kycFields (JSON)
- `VendorStaff` — links Staff to Vendor with vendor-specific roles (VENDOR_ADMIN, VENDOR_MANAGER, VENDOR_STAFF)

**New/modified files:**
- `prisma/schema.prisma` — Add Vendor, VendorStaff models; add vendorId to MenuItem, Order, OrderItem
- `src/lib/permissions.ts` — Add vendor roles + vendor permissions
- `src/app/api/vendors/route.ts` — CRUD vendors
- `src/app/api/vendors/[id]/route.ts` — Single vendor ops
- `src/app/api/vendors/[id]/staff/route.ts` — Vendor staff management
- `src/app/api/vendors/[id]/menu/route.ts` — Vendor menu management
- `src/app/api/vendors/[id]/reports/route.ts` — Vendor dashboard data
- `src/app/dashboard/vendors/page.tsx` — Vendor list
- `src/app/dashboard/vendors/[id]/page.tsx` — Vendor detail/dashboard

**Key decision:** Tenant has multiple vendors (food hall model). vendorId is added to orders/menu items. Single-restaurant = tenant with one vendor.

### 2.2 Unified Cart + Unified Checkout

**New Prisma models:**
- `CartSession` — id, tenantId, branchId, tableId?, guestToken, status (OPEN/CLOSED), createdAt
- `CartItem` — id, cartSessionId, vendorId, menuItemId, quantity, unitPrice, variant, notes

**New files:**
- `src/app/api/cart/route.ts` — Create/get cart session
- `src/app/api/cart/items/route.ts` — Add/remove/update items (multi-vendor)
- `src/app/api/cart/checkout/route.ts` — Convert cart to orders (splits by vendor automatically)
- `src/lib/cart.ts` — Cart logic: split by vendor, calculate totals per vendor

**Logic:** One cart → checkout → N orders (one per vendor) → single payment → split settlement

### 2.3 Settlement + Fees + Rent Automation

**New Prisma models:**
- `CommissionRule` — id, tenantId, vendorId?, type (PERCENTAGE/FLAT/TIERED), value, minOrder?, channel?
- `RentAgreement` — id, tenantId, vendorId, type (FIXED/REVENUE_SHARE/HYBRID), fixedAmount?, sharePercentage?, billingCycle
- `SettlementLedger` — id, tenantId, vendorId, orderId?, type (SALE/COMMISSION/PLATFORM_FEE/RENT/ADJUSTMENT/PAYOUT), amount, balance, description, createdAt
- `VendorPayout` — id, tenantId, vendorId, amount, period, status (PENDING/PAID), paidAt

**New files:**
- `src/lib/settlement.ts` — Commission calc, fee calc, ledger entry creation
- `src/app/api/settlement/route.ts` — Settlement overview
- `src/app/api/settlement/vendors/[id]/route.ts` — Vendor settlement detail
- `src/app/api/settlement/payouts/route.ts` — Payout management
- `src/app/dashboard/settlement/page.tsx` — Reconciliation dashboard

---

## STAGE 3 — Ordering Channels (QR + Web + Smart Tabs)

**STATUS: NOT STARTED**

### 3.1 QR & Mobile Web Ordering

**New files:**
- `src/app/order/[tenantSlug]/page.tsx` — Public guest menu (no auth)
- `src/app/order/[tenantSlug]/[vendorSlug]/page.tsx` — Vendor menu
- `src/app/order/[tenantSlug]/cart/page.tsx` — Guest cart
- `src/app/order/[tenantSlug]/status/[orderId]/page.tsx` — Live order tracking
- `src/app/api/guest/menu/route.ts` — Public menu API
- `src/app/api/guest/cart/route.ts` — Guest cart API
- `src/app/api/guest/order/route.ts` — Guest order placement
- `src/lib/qr.ts` — QR code generation (table/zone/venue)

### 3.2 Smart Tab Flow

**New Prisma model:**
- `Tab` — id, tenantId, branchId, tableId?, guestName, cardToken (encrypted ref), status (OPEN/CLOSED), autoCloseAt?, totalSpent

**New files:**
- `src/app/api/tabs/route.ts` — Open/close/list tabs
- `src/app/api/tabs/[id]/items/route.ts` — Add items to open tab
- `src/app/api/tabs/[id]/close/route.ts` — Close and charge

### 3.3 Notifications

**New files:**
- `src/lib/notifications.ts` — Notification dispatcher (email/SMS abstraction)
- `src/app/api/notifications/route.ts` — Notification preferences + history

---

## STAGE 4 — Kitchen + Fulfillment (Real-time Upgrade)

**STATUS: PARTIALLY DONE** — SSE exists, KDS page exists, but needs upgrade

### 4.1 Real-time KDS Upgrade

**Already have:** SSE endpoints (`/api/sse/orders`, `/api/sse/dashboard`), `useSSE` hook, KDS page with KitchenOrderCard + KitchenTimer

**Still needed:**
- `src/lib/events.ts` — Central event publisher (OrderEvent system)
- Vendor-specific KDS streams (filter by vendorId)
- Station routing (kitchen/bar/dessert) — add `station` field to OrderItem
- Sound alerts on new orders
- Prep timer improvements

### 4.2 Order Throttling + Batching

**New Prisma models:**
- `VendorCapacityRule` — id, vendorId, maxOrdersPerWindow, windowMinutes, maxActiveTickets
- `OrderThrottleLog` — id, vendorId, action (THROTTLED/PAUSED/RESUMED), reason, createdAt

**New files:**
- `src/lib/throttle.ts` — Throttling logic (check vendor capacity, pause/resume)
- `src/app/api/vendors/[id]/capacity/route.ts` — Configure capacity rules

### 4.3 Pickup & Runner Flow

**New files:**
- `src/app/dashboard/pickup/page.tsx` — Ready screen with pickup codes
- `src/app/api/orders/[id]/pickup/route.ts` — Confirm pickup

---

## STAGE 5 — Data Intelligence Layer (Analytics Engine)

**STATUS: MOSTLY DONE** — Built in Phase 3 implementation

### Already built:
| Component | Status | Files |
|-----------|--------|-------|
| DailySalesSummary model | DONE | `prisma/schema.prisma` |
| HourlySalesSummary model | DONE | `prisma/schema.prisma` |
| InventorySummary model | DONE | `prisma/schema.prisma` |
| AggregationJob model | DONE | `prisma/schema.prisma` |
| Daily/hourly/inventory aggregators | DONE | `src/lib/aggregation/` |
| Aggregation API + cron | DONE | `src/app/api/aggregation/` |
| Summary read endpoint | DONE | `src/app/api/reports/summary/` |
| Predictions (peak hours, forecast, reorder) | DONE | `src/lib/predictions/`, `src/app/api/predictions/` |
| Analytics dashboard | DONE | `src/app/dashboard/analytics/` |

### Still needed for multi-vendor:
- `VendorSalesSummary` model — vendorId + daily metrics
- `VendorHourlySummary` model — vendorId + hourly metrics
- `CustomerSalesSummary` model — (needs Customer model first)
- `ItemPerformanceSummary` model — per-item profit + popularity metrics
- Vendor-scoped aggregation jobs
- Update existing aggregators to include vendorId

---

## STAGE 6 — The 5 Core AI Features

**STATUS: FOUNDATION LAID (predictions exist), FULL AI NOT STARTED**

### (1) AI Demand Forecasting — PARTIALLY DONE
- Sales forecast (7/30 day) — DONE (`src/lib/predictions/sales-forecast.ts`)
- Peak hour prediction — DONE (`src/lib/predictions/peak-hours.ts`)
- **Still needed:** Vendor-specific forecasts, branch comparison, staffing suggestions, confidence explainability

### (2) AI Smart Marketing Automation — NOT STARTED
**Requires Customer model first:**
- `Customer` model — id, tenantId, name, phone, email, totalOrders, totalSpent, lastOrderAt, firstOrderAt
- `CustomerSegment` — RFM scoring fields
- `Campaign` model — type, trigger, template, status, sentCount, openRate
- `src/lib/ai/marketing.ts` — RFM engine, churn detection, campaign triggers
- `src/app/api/ai/marketing/route.ts`
- `src/app/dashboard/marketing/page.tsx`

### (3) AI Inventory Prediction — PARTIALLY DONE
- Reorder suggestions — DONE (`src/lib/predictions/reorder-suggestions.ts`)
- **Still needed:** Supplier lead time, waste pattern detection, auto purchase draft with approval

### (4) AI Profit Optimization Dashboard — NOT STARTED
- `src/lib/ai/profit.ts` — Menu engineering matrix (Star/Puzzle/Plowhorse/Dog), margin calc, discount misuse detection
- `src/app/api/ai/profit/route.ts`
- `src/app/dashboard/ai/profit/page.tsx`
- `src/components/ai/MenuEngineeringMatrix.tsx`

### (5) AI Recommendation Engine — NOT STARTED
- `src/lib/ai/recommendations.ts` — Frequently bought together, time-based, profit-prioritized
- `src/app/api/ai/recommendations/route.ts`
- Integration points: POS order form, QR checkout

---

## STAGE 7 — LLM Insight + Owner AI

**STATUS: NOT STARTED**

- `AIInsight` model — id, tenantId, type, period, content, summary, data (JSON), generatedAt
- `src/lib/ai/insight-generator.ts` — Pulls from summary tables, builds prompts, stores insights
- `src/lib/ai/chat.ts` — Owner AI chat (read-only, tenant-scoped, guardrailed)
- `src/app/api/ai/insights/route.ts` — Generated insights
- `src/app/api/ai/chat/route.ts` — Chat endpoint
- `src/app/dashboard/ai/insights/page.tsx`
- `src/app/dashboard/ai/chat/page.tsx`

---

## STAGE 8 — Offline + Reliability

**STATUS: NOT STARTED**

- Service worker + PWA manifest
- IndexedDB offline store
- Offline order queue + sync engine
- Conflict resolution
- Retry policies for settlement + notifications
- System health dashboard

---

## STAGE 9 — SaaS Billing + Monetization

**STATUS: NOT STARTED**

- `Subscription` model — tenantId, plan, status, trialEndsAt, currentPeriodEnd
- `Invoice` model — tenantId, amount, status (PENDING/PAID/OVERDUE), dueDate
- `PlanConfig` model — name, maxBranches, maxVendors, aiEnabled, price
- Feature gating middleware
- `src/app/dashboard/admin/` — Super admin console

---

## STAGE 10 — Beta Launch

- PostgreSQL migration
- Production deployment
- CSV import tools
- Pilot onboarding
- Feedback tracker

---

## STAGE 11 — Scale & Performance

- PostgreSQL + indexes
- Redis caching (menu, summaries)
- Background job queue
- Load testing

---

## STAGE 12 — Advanced Moat Features

- Dynamic pricing engine
- Fraud detection
- Smart staff scheduling
- Waste forecasting
- Autonomous AI agents with approval workflows

---

## BUILD ORDER (Next Implementation Sequence)

Based on analysis, the next stage to build is **STAGE 2: Multi-Vendor Marketplace Core**. This is the biggest architectural shift and everything after depends on it.

### Recommended build sequence:

| # | Task | Est. Files | Depends On |
|---|------|-----------|------------|
| 1 | Vendor model + vendor roles + vendor CRUD | ~12 | Nothing |
| 2 | Add vendorId to MenuItem, Order, OrderItem | ~8 | #1 |
| 3 | Unified cart + multi-vendor checkout | ~6 | #1, #2 |
| 4 | Settlement engine (commission/rent/ledger) | ~8 | #1, #2 |
| 5 | Vendor dashboard + reporting | ~4 | #1, #4 |
| 6 | QR & mobile web ordering (Stage 3.1) | ~8 | #2, #3 |
| 7 | Smart tab flow (Stage 3.2) | ~4 | #3 |
| 8 | KDS upgrade + vendor routing (Stage 4.1) | ~4 | #2 |
| 9 | Order throttling + batching (Stage 4.2) | ~4 | #1, #8 |
| 10 | Vendor summary tables + aggregation (Stage 5 gap) | ~4 | #1, #2 |
| 11 | AI Demand Forecasting enhancements (Stage 6.1) | ~3 | #10 |
| 12 | AI Profit Optimization (Stage 6.4) | ~4 | #10 |
| 13 | Customer model + AI Marketing (Stage 6.2) | ~6 | #6 |
| 14 | AI Inventory Prediction enhancements (Stage 6.3) | ~3 | #10 |
| 15 | AI Recommendation Engine (Stage 6.5) | ~3 | #10, #13 |
| 16 | LLM Insight + Owner AI (Stage 7) | ~6 | #11-15 |
| 17 | Offline/PWA (Stage 8) | ~6 | #6 |
| 18 | SaaS Billing (Stage 9) | ~6 | #1 |
| 19 | PostgreSQL migration (Stage 11) | ~3 | Before beta |
| 20 | Beta launch prep (Stage 10) | ~4 | All above |

**Total estimated: ~100+ new files across all stages**

### Immediate next step: Stage 2.1 — Vendor Model + Vendor Ops
