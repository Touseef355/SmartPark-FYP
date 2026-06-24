import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { Users, Plus, Edit2, Trash2, Save, X, Mail, Phone, Shield, UserCheck, UserX } from 'lucide-react'
import { getUser } from '../../utils/auth'

const Cashiers = () => {
  const [isAddingCashier, setIsAddingCashier] = useState(false)
  const [editingCashier, setEditingCashier] = useState(null)
  const [cashiers, setCashiers] = useState([])
  const [siteId, setSiteId] = useState(null)
  const [sites, setSites] = useState([])

  const [newCashier, setNewCashier] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    shift: 'Morning',
    cashier_type: 'entry_cashier'
  })

  useEffect(() => {
    fetchSiteAndCashiers()
    const channel = supabase
  .channel('cashiers_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'cashiers' },
        () => fetchCashiers()
      )
  .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchSiteAndCashiers = async () => {
    const { user_id } = getUser()
    if (!user_id) return
    const { data: ownerSites } = await supabase
      .from('parking_sites')
      .select('*')
      .eq('owner_id', user_id)
      .order('name')
    setSites(ownerSites || [])
    if (ownerSites?.length) {
      setSiteId(ownerSites[0].id)
      await fetchCashiers(ownerSites[0].id)
    }
  }

  const fetchCashiers = async (currentSiteId = siteId) => {
    if (!currentSiteId) return
    const { data } = await supabase
  .from('cashiers')
  .select('*')
  .eq('site_id', currentSiteId)
  .order('name')

    const mapped = (data || []).map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      status: c.status || 'Active',
      shift: c.shift || 'Morning',
      cashier_type: c.cashier_type || 'entry_cashier',
      totalCollections: c.total_collections || 0
    }))
    setCashiers(mapped)
  }

  const handleAddCashier = async () => {
    if (!newCashier.name || !newCashier.email) {
      return alert('Please fill name and email')
    }
    const { error } = await supabase.from('cashiers').insert([{
      site_id: siteId,
      name: newCashier.name,
      email: newCashier.email,
      phone: newCashier.phone,
      shift: newCashier.shift,
      cashier_type: newCashier.cashier_type,
      status: 'Active'
    }])
    if (error) return alert('Error: ' + error.message)

    setNewCashier({ name: '', email: '', phone: '', password: '', shift: 'Morning', cashier_type: 'entry_cashier' })
    setIsAddingCashier(false)
    await fetchCashiers()
  }

  const handleDeleteCashier = async (id) => {
    if (!confirm('Delete this cashier?')) return
    await supabase.from('cashiers').delete().eq('id', id)
    await fetchCashiers()
  }

  const handleToggleStatus = async (id) => {
    const cashier = cashiers.find(c => c.id === id)
    const newStatus = cashier.status === 'Active'? 'Inactive' : 'Active'
    await supabase.from('cashiers').update({ status: newStatus }).eq('id', id)
    await fetchCashiers()
  }

  const handleEditCashier = (cashier) => {
    setEditingCashier({...cashier, password: '' })
  }

  const handleSaveEdit = async () => {
    await supabase.from('cashiers').update({
      name: editingCashier.name,
      email: editingCashier.email,
      phone: editingCashier.phone,
      shift: editingCashier.shift
    }).eq('id', editingCashier.id)

    setEditingCashier(null)
    await fetchCashiers()
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cashiers Management</h1>
          <p className="text-gray-600 mt-1">Manage cashiers and their shifts for your parking site</p>
        </div>
        <button onClick={() => setIsAddingCashier(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add New Cashier
        </button>
      </div>

      {sites.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Select Site:</span>
          <select
            value={siteId || ''}
            onChange={async (e) => {
              const selectedId = e.target.value
              setSiteId(selectedId)
              await fetchCashiers(selectedId)
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Cashiers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{cashiers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{cashiers.filter(c => c.status === 'Active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{cashiers.filter(c => c.status === 'Inactive').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Collections</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">Rs. {cashiers.reduce((sum, c) => sum + c.totalCollections, 0).toLocaleString()}</p>
        </div>
      </div>

      {isAddingCashier && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Cashier</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500 font-medium">Full Name *</label>
              <input type="text" placeholder="e.g. Ahmed Ali" value={newCashier.name} onChange={(e) => setNewCashier({...newCashier, name: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium">Email *</label>
              <input type="email" placeholder="cashier@smartpark.com" value={newCashier.email} onChange={(e) => setNewCashier({...newCashier, email: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium">Phone</label>
              <input type="text" placeholder="+92 300 1234567" value={newCashier.phone} onChange={(e) => setNewCashier({...newCashier, phone: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium">Password *</label>
              <input type="password" placeholder="Min 6 characters" value={newCashier.password} onChange={(e) => setNewCashier({...newCashier, password: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium">Shift</label>
              <select value={newCashier.shift} onChange={(e) => setNewCashier({...newCashier, shift: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium">Cashier Type *</label>
              <select value={newCashier.cashier_type} onChange={(e) => setNewCashier({...newCashier, cashier_type: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="entry_cashier">Entry Cashier</option>
                <option value="exit_cashier">Exit Cashier</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddCashier} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Save className="w-4 h-4" /> Add Cashier
            </button>
            <button onClick={() => setIsAddingCashier(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Cashier</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Shift</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Collections</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cashiers.map((cashier) => (
                <tr key={cashier.id} className="hover:bg-gray-50">
                  {editingCashier?.id === cashier.id? (
                    <td colSpan="6" className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input type="text" value={editingCashier.name} onChange={(e) => setEditingCashier({...editingCashier, name: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        <input type="email" value={editingCashier.email} onChange={(e) => setEditingCashier({...editingCashier, email: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg">Save</button>
                          <button onClick={() => setEditingCashier(null)} className="flex-1 px-3 py-2 bg-gray-500 text-white text-sm rounded-lg">Cancel</button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                            {cashier.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{cashier.name}</p>
                            <p className="text-xs text-gray-500">ID: {cashier.id?.toString().slice(0,8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900 flex items-center gap-1"><Mail className="w-3 h-3" /> {cashier.email}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {cashier.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">{cashier.shift}</span></td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full font-medium ${cashier.cashier_type === 'entry_cashier' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{cashier.cashier_type === 'entry_cashier' ? 'Entry' : 'Exit'}</span></td>
                      <td className="px-6 py-4"><p className="text-sm font-semibold text-green-600">Rs. {cashier.totalCollections.toLocaleString()}</p></td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleToggleStatus(cashier.id)} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cashier.status === 'Active'? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                          {cashier.status === 'Active'? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {cashier.status}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditCashier(cashier)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCashier(cashier.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Cashiers