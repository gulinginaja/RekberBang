'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addQrisSetting, toggleQrisStatus, deleteQrisSetting } from '@/server/actions/admin.actions'

export function QrisManagementTab({ qrisSettings }: { qrisSettings: any[] }) {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    setError('')
    if (!name || !file) {
      setError('Please provide a name and select a QRIS image.')
      return
    }
    
    setLoading(true)
    const supabase = createClient()
    
    // Upload image to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('rekber_evidence') // Using the existing evidence bucket for simplicity
      .upload(`qris/${fileName}`, file)

    if (uploadError) {
      setError(`Failed to upload image: ${uploadError.message}`)
      setLoading(false)
      return
    }

    const imageUrl = `qris/${fileName}`
    const res = await addQrisSetting(imageUrl, name)
    
    if (res.error) {
      setError(res.error)
    } else {
      setName('')
      setFile(null)
      // reset file input visually
      const fileInput = document.getElementById('qris-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    }
    setLoading(false)
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    await toggleQrisStatus(id, !currentStatus)
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this QRIS?')) {
      await deleteQrisSetting(id)
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload QRIS</CardTitle>
          <CardDescription>Upload a new QRIS code for buyers to scan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <Label>QRIS Name / Label</Label>
              <Input placeholder="e.g. QRIS DANA Utama" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>QRIS Image</Label>
              <Input 
                id="qris-upload"
                type="file" 
                accept="image/*" 
                onChange={e => setFile(e.target.files?.[0] || null)} 
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <Button onClick={handleAdd} disabled={loading} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
            {loading ? 'Uploading...' : <><Upload className="w-4 h-4 mr-2" /> Upload QRIS</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active QRIS Settings</CardTitle>
          <CardDescription>Manage your existing QRIS codes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qrisSettings.length === 0 && (
              <p className="text-slate-500 text-sm p-4 bg-slate-50 rounded text-center">No QRIS codes found.</p>
            )}
            
            {qrisSettings.map(qris => (
              <div key={qris.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center overflow-hidden border">
                     <img 
                       src={`${supabaseUrl}/storage/v1/object/public/rekber_evidence/${qris.image_url}`} 
                       alt={qris.name}
                       className="max-w-full max-h-full object-contain"
                       onError={(e) => {
                         // Fallback for authenticated bucket if public fails
                         (e.target as HTMLImageElement).src = `${supabaseUrl}/storage/v1/object/authenticated/rekber_evidence/${qris.image_url}`;
                       }}
                     />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{qris.name}</span>
                      <Badge variant={qris.is_active ? 'default' : 'secondary'} className={qris.is_active ? 'bg-indigo-500' : ''}>
                        {qris.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`switch-qris-${qris.id}`} className="text-sm cursor-pointer">Active</Label>
                    <Switch 
                      id={`switch-qris-${qris.id}`} 
                      checked={qris.is_active} 
                      onCheckedChange={() => handleToggle(qris.id, qris.is_active)} 
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(qris.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
