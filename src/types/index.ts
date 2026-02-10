import { Role, OrderType, OrderStatus, TableStatus, ItemStatus, PaymentMethod, DiscountType } from "@prisma/client"

export type { Role, OrderType, OrderStatus, TableStatus, ItemStatus, PaymentMethod, DiscountType }

export interface StaffSession {
  id: string
  name: string
  role: Role
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  variant?: string
  variantPriceAdj?: number
  notes?: string
}

export interface OrderSummary {
  subtotal: number
  taxAmount: number
  discount: number
  discountType?: DiscountType
  total: number
}

declare module "next-auth" {
  interface User {
    id: string
    name: string
    role: Role
  }
  interface Session {
    user: {
      id: string
      name: string
      role: Role
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffId: string
    role: Role
  }
}
