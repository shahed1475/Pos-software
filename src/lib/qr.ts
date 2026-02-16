// QR code URL generator for tables, zones, and venues
// Uses a public QR code API for generation — no dependency needed

export function generateOrderUrl(params: {
  baseUrl: string
  tenantSlug: string
  tableNumber?: number
  vendorSlug?: string
}) {
  const { baseUrl, tenantSlug, tableNumber, vendorSlug } = params
  let url = `${baseUrl}/order/${tenantSlug}`
  if (vendorSlug) url += `/${vendorSlug}`
  if (tableNumber) url += `?table=${tableNumber}`
  return url
}

export function generateQrCodeUrl(data: string, size = 300): string {
  // Uses a public QR code generation API
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

export function generateTableQrCodes(params: {
  baseUrl: string
  tenantSlug: string
  tables: { number: number; id: string }[]
}) {
  return params.tables.map((table) => ({
    tableId: table.id,
    tableNumber: table.number,
    orderUrl: generateOrderUrl({
      baseUrl: params.baseUrl,
      tenantSlug: params.tenantSlug,
      tableNumber: table.number,
    }),
    qrCodeUrl: generateQrCodeUrl(
      generateOrderUrl({
        baseUrl: params.baseUrl,
        tenantSlug: params.tenantSlug,
        tableNumber: table.number,
      })
    ),
  }))
}
