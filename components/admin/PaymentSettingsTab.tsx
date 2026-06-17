'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2 } from 'lucide-react'
import { addPaymentMethod, togglePaymentMethodStatus, deletePaymentMethod } from '@/server/actions/admin.actions'

export function PaymentSettingsTab({ paymentMethods }: { paymentMethods: any[] }) {
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    setError('')
    if (!bankName || !accountNumber || !accountHolder) {
      setError('Please fill all fields')
      return
    }
    
    setLoading(true)
    const res = await addPaymentMethod({
      bank_name: bankName,
      account_number: accountNumber,
      account_holder: accountHolder
    })
    
    if (res.error) {
      setError(res.error)
    } else {
      setBankName('')
      setAccountNumber('')
      setAccountHolder('')
    }
    setLoading(false)
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    await togglePaymentMethodStatus(id, !currentStatus)
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this payment method?')) {
      await deletePaymentMethod(id)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Bank Account</CardTitle>
          <CardDescription>Add a new bank account or e-wallet for buyers to transfer funds.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <Label>Bank / E-Wallet Name</Label>
              <Input placeholder="e.g. BCA, DANA" value={bankName} onChange={e => setBankName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Account Number</Label>
              <Input placeholder="e.g. 1234567890" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Account Holder Name</Label>
              <Input placeholder="e.g. PT Rekber Bang" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <Button onClick={handleAdd} disabled={loading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" /> Add Account
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Payment Accounts</CardTitle>
          <CardDescription>Manage your existing payment accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.length === 0 && (
              <p className="text-slate-500 text-sm p-4 bg-slate-50 rounded text-center">No payment methods found.</p>
            )}
            
            {paymentMethods.map(pm => (
              <div key={pm.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{pm.bank_name}</span>
                    <Badge variant={pm.is_active ? 'default' : 'secondary'} className={pm.is_active ? 'bg-emerald-500' : ''}>
                      {pm.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-slate-800 font-mono">{pm.account_number}</p>
                  <p className="text-slate-500 text-sm">a/n {pm.account_holder}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`switch-${pm.id}`} className="text-sm cursor-pointer">Active</Label>
                    <Switch 
                      id={`switch-${pm.id}`} 
                      checked={pm.is_active} 
                      onCheckedChange={() => handleToggle(pm.id, pm.is_active)} 
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(pm.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
