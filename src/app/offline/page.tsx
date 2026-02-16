export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold">You are offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          FluxPOS is currently offline. You can continue using cached screens. Actions will sync after reconnection.
        </p>
      </div>
    </main>
  )
}
