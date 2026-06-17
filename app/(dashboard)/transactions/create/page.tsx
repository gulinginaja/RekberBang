import { CreateTransactionForm } from '@/components/transactions/CreateTransactionForm'
import { TermsGate } from '@/components/auth/terms-gate'

export default function NewTransactionPage() {
  return (
    <TermsGate>
      <div className="pb-10">
        <CreateTransactionForm />
      </div>
    </TermsGate>
  )
}
