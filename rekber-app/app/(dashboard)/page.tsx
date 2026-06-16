import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Example data fetch
  // const { data: transactions } = await supabase.from('transactions').select('*')

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 shadow-sm">
        <h2 className="font-medium mb-2">No active transactions</h2>
        <p className="text-sm text-muted-foreground mb-4">Start a new escrow transaction safely.</p>
        <button className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium">
          Create Transaction
        </button>
      </div>
    </div>
  )
}
