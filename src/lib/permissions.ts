export type Permission =
  | "orders:create"
  | "orders:read"
  | "orders:update"
  | "orders:cancel"
  | "menu:read"
  | "menu:create"
  | "menu:update"
  | "menu:delete"
  | "categories:read"
  | "categories:manage"
  | "inventory:read"
  | "inventory:manage"
  | "staff:read"
  | "staff:manage"
  | "tables:read"
  | "tables:manage"
  | "reports:read"
  | "settings:read"
  | "settings:manage"
  | "kitchen:read"
  | "kitchen:update"
  | "billing:create"
  | "billing:read"
  | "expenses:read"
  | "expenses:manage"
  | "audit:read"
  | "analytics:read"
  | "analytics:aggregate"
  | "vendors:read"
  | "vendors:manage"
  | "vendors:create"
  | "settlement:read"
  | "settlement:manage"
  | "cart:read"
  | "cart:manage"
  | "admin:all"

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ["admin:all"],

  ADMIN: [
    "orders:create", "orders:read", "orders:update", "orders:cancel",
    "menu:read", "menu:create", "menu:update", "menu:delete",
    "categories:read", "categories:manage",
    "inventory:read", "inventory:manage",
    "staff:read", "staff:manage",
    "tables:read", "tables:manage",
    "reports:read",
    "settings:read", "settings:manage",
    "kitchen:read", "kitchen:update",
    "billing:create", "billing:read",
    "expenses:read", "expenses:manage",
    "audit:read",
    "analytics:read", "analytics:aggregate",
    "vendors:read", "vendors:manage", "vendors:create",
    "settlement:read", "settlement:manage",
    "cart:read", "cart:manage",
  ],

  MANAGER: [
    "orders:create", "orders:read", "orders:update", "orders:cancel",
    "menu:read", "menu:create", "menu:update", "menu:delete",
    "categories:read", "categories:manage",
    "inventory:read", "inventory:manage",
    "staff:read",
    "tables:read", "tables:manage",
    "reports:read",
    "settings:read",
    "kitchen:read", "kitchen:update",
    "billing:create", "billing:read",
    "expenses:read", "expenses:manage",
    "analytics:read",
    "vendors:read",
    "settlement:read",
    "cart:read", "cart:manage",
  ],

  CASHIER: [
    "orders:create", "orders:read", "orders:update",
    "menu:read",
    "categories:read",
    "tables:read",
    "billing:create", "billing:read",
    "kitchen:read",
    "cart:read", "cart:manage",
  ],

  WAITER: [
    "orders:create", "orders:read", "orders:update",
    "menu:read",
    "categories:read",
    "tables:read", "tables:manage",
    "kitchen:read",
    "billing:create",
    "cart:read", "cart:manage",
  ],

  KITCHEN: [
    "orders:read",
    "kitchen:read", "kitchen:update",
    "menu:read",
    "inventory:read",
  ],

  // Vendor-specific roles
  VENDOR_ADMIN: [
    "orders:read", "orders:update",
    "menu:read", "menu:create", "menu:update", "menu:delete",
    "categories:read", "categories:manage",
    "inventory:read", "inventory:manage",
    "staff:read", "staff:manage",
    "kitchen:read", "kitchen:update",
    "reports:read",
    "analytics:read",
    "settlement:read",
    "vendors:read",
  ],

  VENDOR_MANAGER: [
    "orders:read", "orders:update",
    "menu:read", "menu:create", "menu:update",
    "categories:read",
    "inventory:read", "inventory:manage",
    "staff:read",
    "kitchen:read", "kitchen:update",
    "reports:read",
    "analytics:read",
    "settlement:read",
    "vendors:read",
  ],

  VENDOR_STAFF: [
    "orders:read",
    "menu:read",
    "kitchen:read", "kitchen:update",
    "inventory:read",
    "vendors:read",
  ],
}

export function hasPermission(role: string, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return true
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes(permission)
}

export function requirePermission(role: string, permission: Permission): boolean {
  return hasPermission(role, permission)
}

export function getPermissionsForRole(role: string): Permission[] {
  if (role === "SUPER_ADMIN") return Object.values(ROLE_PERMISSIONS).flat()
  return ROLE_PERMISSIONS[role] || []
}

export function isVendorRole(role: string): boolean {
  return role.startsWith("VENDOR_")
}

// Navigation items visibility by role
export interface NavItem {
  name: string
  href: string
  permissions: Permission[]
}

export const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", permissions: ["orders:read"] },
  { name: "New Order", href: "/dashboard/orders/new", permissions: ["orders:create"] },
  { name: "Orders", href: "/dashboard/orders", permissions: ["orders:read"] },
  { name: "Kitchen", href: "/dashboard/kitchen", permissions: ["kitchen:read"] },
  { name: "Tables", href: "/dashboard/tables", permissions: ["tables:read"] },
  { name: "Menu", href: "/dashboard/menu", permissions: ["menu:read"] },
  { name: "Vendors", href: "/dashboard/vendors", permissions: ["vendors:read"] },
  { name: "Inventory", href: "/dashboard/inventory", permissions: ["inventory:read"] },
  { name: "Staff", href: "/dashboard/staff", permissions: ["staff:read"] },
  { name: "Settlement", href: "/dashboard/settlement", permissions: ["settlement:read"] },
  { name: "Reports", href: "/dashboard/reports", permissions: ["reports:read"] },
  { name: "Analytics", href: "/dashboard/analytics", permissions: ["analytics:read"] },
  { name: "Expenses", href: "/dashboard/expenses", permissions: ["expenses:read"] },
  { name: "Settings", href: "/dashboard/settings", permissions: ["settings:read"] },
  { name: "Admin", href: "/dashboard/admin", permissions: ["admin:all"] },
]

export function getVisibleNavItems(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) =>
    item.permissions.some((perm) => hasPermission(role, perm))
  )
}
