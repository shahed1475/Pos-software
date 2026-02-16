import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Clear existing data in reverse dependency order
  await prisma.auditLog.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.planConfig.deleteMany()
  await prisma.waste.deleteMany()
  await prisma.inventoryLog.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.itemIngredient.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.menuVariant.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.category.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.shift.deleteMany()
  await prisma.table.deleteMany()
  await prisma.staff.deleteMany()
  await prisma.branch.deleteMany()
  await prisma.tenant.deleteMany()

  // Create default Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "FluxPOS",
      slug: "fluxpos",
      email: "info@fluxpos.com",
      phone: "+1 234 567 890",
      plan: "premium",
      maxBranches: 3,
      active: true,
    },
  })

  await prisma.planConfig.createMany({
    data: [
      { name: "basic", maxBranches: 1, maxVendors: 1, aiEnabled: false, price: 29 },
      { name: "pro", maxBranches: 3, maxVendors: 10, aiEnabled: true, price: 99 },
      { name: "enterprise", maxBranches: 20, maxVendors: 100, aiEnabled: true, price: 299 },
    ],
  })

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "pro",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
  })

  // Create default Branch (replaces Restaurant model)
  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: "Main Branch",
      address: "123 Main Street, City",
      phone: "+1 234 567 890",
      email: "info@restopos.com",
      taxRate: 10,
      currency: "USD",
      active: true,
    },
  })

  // Create Super Admin (not tied to any tenant)
  const superAdminPin = await bcrypt.hash("0000", 10)
  await prisma.staff.create({
    data: {
      name: "Super Admin",
      pin: superAdminPin,
      role: "SUPER_ADMIN",
      email: "superadmin@fluxpos.com",
      active: true,
    },
  })

  // Staff (tied to tenant + branch)
  const adminPin = await bcrypt.hash("1234", 10)
  const managerPin = await bcrypt.hash("5678", 10)
  const cashierPin = await bcrypt.hash("1111", 10)
  const waiterPin = await bcrypt.hash("2222", 10)
  const kitchenPin = await bcrypt.hash("3333", 10)

  await prisma.staff.createMany({
    data: [
      { name: "Admin User", pin: adminPin, role: "ADMIN", email: "admin@restopos.com", tenantId: tenant.id, branchId: branch.id },
      { name: "Manager", pin: managerPin, role: "MANAGER", email: "manager@restopos.com", tenantId: tenant.id, branchId: branch.id },
      { name: "Cashier", pin: cashierPin, role: "CASHIER", tenantId: tenant.id, branchId: branch.id },
      { name: "Waiter", pin: waiterPin, role: "WAITER", tenantId: tenant.id, branchId: branch.id },
      { name: "Kitchen Staff", pin: kitchenPin, role: "KITCHEN", tenantId: tenant.id, branchId: branch.id },
    ],
  })

  // Categories
  const appetizers = await prisma.category.create({
    data: { name: "Appetizers", sortOrder: 1, tenantId: tenant.id },
  })
  const mains = await prisma.category.create({
    data: { name: "Main Course", sortOrder: 2, tenantId: tenant.id },
  })
  const burgers = await prisma.category.create({
    data: { name: "Burgers", sortOrder: 3, tenantId: tenant.id },
  })
  const pizzas = await prisma.category.create({
    data: { name: "Pizza", sortOrder: 4, tenantId: tenant.id },
  })
  const drinks = await prisma.category.create({
    data: { name: "Drinks", sortOrder: 5, tenantId: tenant.id },
  })
  const desserts = await prisma.category.create({
    data: { name: "Desserts", sortOrder: 6, tenantId: tenant.id },
  })

  // Menu Items
  await prisma.menuItem.createMany({
    data: [
      { name: "Caesar Salad", description: "Fresh romaine lettuce with caesar dressing", price: 8.99, categoryId: appetizers.id, tenantId: tenant.id },
      { name: "Garlic Bread", description: "Toasted bread with garlic butter", price: 5.99, categoryId: appetizers.id, tenantId: tenant.id },
      { name: "Chicken Wings", description: "Crispy wings with buffalo sauce", price: 11.99, categoryId: appetizers.id, tenantId: tenant.id },
      { name: "Soup of the Day", description: "Ask your server for today's selection", price: 6.99, categoryId: appetizers.id, tenantId: tenant.id },
      { name: "Bruschetta", description: "Toasted bread with tomato and basil", price: 7.99, categoryId: appetizers.id, tenantId: tenant.id },
      { name: "Grilled Salmon", description: "Atlantic salmon with lemon butter sauce", price: 22.99, categoryId: mains.id, tenantId: tenant.id },
      { name: "Chicken Parmesan", description: "Breaded chicken with marinara and mozzarella", price: 18.99, categoryId: mains.id, tenantId: tenant.id },
      { name: "Steak & Fries", description: "8oz ribeye with hand-cut fries", price: 28.99, categoryId: mains.id, tenantId: tenant.id },
      { name: "Pasta Carbonara", description: "Spaghetti with bacon, egg, and parmesan", price: 15.99, categoryId: mains.id, tenantId: tenant.id },
      { name: "Fish & Chips", description: "Beer-battered cod with tartar sauce", price: 16.99, categoryId: mains.id, tenantId: tenant.id },
      { name: "Classic Burger", description: "Beef patty with lettuce, tomato, and onion", price: 12.99, categoryId: burgers.id, tenantId: tenant.id },
      { name: "Cheese Burger", description: "Classic with melted cheddar", price: 13.99, categoryId: burgers.id, tenantId: tenant.id },
      { name: "Bacon Burger", description: "With crispy bacon and BBQ sauce", price: 15.99, categoryId: burgers.id, tenantId: tenant.id },
      { name: "Veggie Burger", description: "Plant-based patty with avocado", price: 13.99, categoryId: burgers.id, tenantId: tenant.id },
      { name: "Margherita", description: "Tomato sauce, mozzarella, fresh basil", price: 14.99, categoryId: pizzas.id, tenantId: tenant.id },
      { name: "Pepperoni", description: "Classic pepperoni with mozzarella", price: 16.99, categoryId: pizzas.id, tenantId: tenant.id },
      { name: "BBQ Chicken", description: "BBQ sauce, chicken, red onion, cilantro", price: 17.99, categoryId: pizzas.id, tenantId: tenant.id },
      { name: "Veggie Supreme", description: "Bell peppers, mushrooms, olives, onions", price: 15.99, categoryId: pizzas.id, tenantId: tenant.id },
      { name: "Coca Cola", description: "330ml can", price: 2.99, categoryId: drinks.id, tenantId: tenant.id },
      { name: "Fresh Orange Juice", description: "Freshly squeezed", price: 4.99, categoryId: drinks.id, tenantId: tenant.id },
      { name: "Coffee", description: "Freshly brewed", price: 3.49, categoryId: drinks.id, tenantId: tenant.id },
      { name: "Iced Tea", description: "Lemon iced tea", price: 3.49, categoryId: drinks.id, tenantId: tenant.id },
      { name: "Water", description: "500ml still water", price: 1.99, categoryId: drinks.id, tenantId: tenant.id },
      { name: "Milkshake", description: "Chocolate, vanilla, or strawberry", price: 5.99, categoryId: drinks.id, tenantId: tenant.id },
      { name: "Chocolate Cake", description: "Rich chocolate layer cake", price: 7.99, categoryId: desserts.id, tenantId: tenant.id },
      { name: "Cheesecake", description: "New York style cheesecake", price: 8.99, categoryId: desserts.id, tenantId: tenant.id },
      { name: "Ice Cream Sundae", description: "Three scoops with toppings", price: 6.99, categoryId: desserts.id, tenantId: tenant.id },
      { name: "Tiramisu", description: "Classic Italian dessert", price: 8.99, categoryId: desserts.id, tenantId: tenant.id },
    ],
  })

  // Tables (tied to tenant + branch)
  await prisma.table.createMany({
    data: [
      { number: 1, capacity: 2, posX: 50, posY: 50, tenantId: tenant.id, branchId: branch.id },
      { number: 2, capacity: 2, posX: 200, posY: 50, tenantId: tenant.id, branchId: branch.id },
      { number: 3, capacity: 4, posX: 350, posY: 50, tenantId: tenant.id, branchId: branch.id },
      { number: 4, capacity: 4, posX: 50, posY: 200, tenantId: tenant.id, branchId: branch.id },
      { number: 5, capacity: 6, posX: 200, posY: 200, tenantId: tenant.id, branchId: branch.id },
      { number: 6, capacity: 6, posX: 350, posY: 200, tenantId: tenant.id, branchId: branch.id },
      { number: 7, capacity: 4, posX: 50, posY: 350, tenantId: tenant.id, branchId: branch.id },
      { number: 8, capacity: 8, posX: 200, posY: 350, tenantId: tenant.id, branchId: branch.id },
      { number: 9, capacity: 4, posX: 350, posY: 350, tenantId: tenant.id, branchId: branch.id },
      { number: 10, capacity: 2, posX: 500, posY: 50, tenantId: tenant.id, branchId: branch.id },
      { number: 11, capacity: 4, posX: 500, posY: 200, tenantId: tenant.id, branchId: branch.id },
      { number: 12, capacity: 6, posX: 500, posY: 350, tenantId: tenant.id, branchId: branch.id },
    ],
  })

  // Ingredients
  await prisma.ingredient.createMany({
    data: [
      { name: "Beef Patty", unit: "pieces", stock: 100, minStock: 20, costPerUnit: 2.5, tenantId: tenant.id },
      { name: "Chicken Breast", unit: "kg", stock: 30, minStock: 5, costPerUnit: 8.0, tenantId: tenant.id },
      { name: "Salmon Fillet", unit: "pieces", stock: 20, minStock: 5, costPerUnit: 12.0, tenantId: tenant.id },
      { name: "Mozzarella", unit: "kg", stock: 15, minStock: 3, costPerUnit: 10.0, tenantId: tenant.id },
      { name: "Lettuce", unit: "kg", stock: 10, minStock: 2, costPerUnit: 3.0, tenantId: tenant.id },
      { name: "Tomatoes", unit: "kg", stock: 15, minStock: 3, costPerUnit: 4.0, tenantId: tenant.id },
      { name: "Onions", unit: "kg", stock: 20, minStock: 5, costPerUnit: 2.0, tenantId: tenant.id },
      { name: "Burger Buns", unit: "pieces", stock: 80, minStock: 20, costPerUnit: 0.5, tenantId: tenant.id },
      { name: "Pizza Dough", unit: "pieces", stock: 40, minStock: 10, costPerUnit: 1.5, tenantId: tenant.id },
      { name: "Coca Cola", unit: "cans", stock: 200, minStock: 50, costPerUnit: 0.8, tenantId: tenant.id },
      { name: "Coffee Beans", unit: "kg", stock: 5, minStock: 1, costPerUnit: 20.0, tenantId: tenant.id },
      { name: "French Fries", unit: "kg", stock: 25, minStock: 5, costPerUnit: 3.0, tenantId: tenant.id },
    ],
  })

  console.log("Seed data created successfully!")
  console.log("Default tenant slug: fluxpos")
  console.log("Super Admin PIN: 0000")
  console.log("Admin PIN: 1234, Manager: 5678, Cashier: 1111, Waiter: 2222, Kitchen: 3333")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
