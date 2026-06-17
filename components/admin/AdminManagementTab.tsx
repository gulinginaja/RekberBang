'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, ShieldOff } from 'lucide-react'
import { addAdminByTelegramId, changeUserRole } from '@/server/actions/admin.actions'

export function AdminManagementTab({ admins }: { admins: any[] }) {
  const [telegramId, setTelegramId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAddAdmin() {
    setError('')
    if (!telegramId) return
    
    setLoading(true)
    const res = await addAdminByTelegramId(Number(telegramId))
    if (res.error) {
      setError(res.error)
    } else {
      setTelegramId('')
    }
    setLoading(false)
  }

  async function handleDemote(id: string) {
    if (confirm('Are you sure you want to demote this admin to a regular user?')) {
      await changeUserRole(id, 'user')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Admin</CardTitle>
          <CardDescription>The user must have logged into the Mini App at least once.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label>Telegram User ID</Label>
              <Input 
                type="number" 
                placeholder="e.g. 123456789" 
                value={telegramId}
                onChange={e => setTelegramId(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddAdmin} disabled={loading || !telegramId} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" /> Add Admin
              </Button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>List of all users with admin or super_admin roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Telegram ID</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="px-4 py-3 font-mono text-xs">{u.telegram_id}</td>
                    <td className="px-4 py-3">@{u.username}</td>
                    <td className="px-4 py-3">{u.first_name}</td>
                    <td className="px-4 py-3">
                      {u.role === 'super_admin' ? <Badge className="bg-purple-600">Super Admin</Badge> : <Badge className="bg-blue-600">Admin</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role === 'admin' && (
                        <Button variant="ghost" size="sm" onClick={() => handleDemote(u.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <ShieldOff className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
