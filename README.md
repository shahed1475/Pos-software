# FluxPOS (Pos-software)

A multi-tenant point-of-sale and operations platform for restaurants and multi-vendor food markets, built with Next.js, TypeScript and Prisma.

## What it covers

- Multi-tenant structure: tenants, branches, vendors, staff and shifts
- Orders, carts, tables and open tabs, with real-time order and dashboard updates over server-sent events
- Menu management with categories, variants and recipes linked to ingredients
- Inventory: stock checks, purchases, waste tracking and inventory logs
- Multi-vendor settlement: commission rules, rent agreements, ledger entries and vendor payouts
- Guest ordering flow: public menu, cart and order endpoints
- Reports and analytics, with daily and hourly sales summaries produced by an aggregation job
- AI endpoints for chat, business insights, profit analysis, marketing ideas and recommendations
- Subscription plans, invoices and billing, plus an admin area for tenants
- Audit log and role-based staff access through NextAuth
- Installable web app with a service worker

## Tech stack

Next.js (App Router), TypeScript, Prisma ORM, NextAuth, Radix UI, Tailwind CSS.

## Run it locally

```
npm install
npm run db:push
npm run db:seed
npm run dev
```

Set your database connection and auth secret in a `.env` file first. Never commit that file.

## Project layout

- `prisma/schema.prisma`: the data model, with 38 models
- `src/app/api`: route handlers for orders, menu, inventory, settlement, AI, billing and admin
- `src/app/dashboard`: the staff and admin dashboard pages
- `finalplan.md`: the development roadmap for the multi-vendor market focus
