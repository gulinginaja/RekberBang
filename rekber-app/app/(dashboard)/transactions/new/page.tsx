import { CreateTransactionForm } from '@/components/transactions/CreateTransactionForm'

export default function NewTransactionPage() {
  return (
    <div className="py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Create Transaction</h2>
        <p className="text-neutral-500">Initiate a secure escrow transaction.</p>
      </div>
      
      <CreateTransactionForm />
    </div>
  )
}
