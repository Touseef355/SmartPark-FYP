import React, { useState, useEffect } from 'react'
import api from '../../api/axios'
import { Grid3x3, Plus, Edit2, Trash2, Save, X, Car, Bike } from 'lucide-react'
import { getUser } from '../../utils/auth'

const SlotConfig = () => {
  const [isAddingSlot, setIsAddingSlot] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [slots, setSlots] = useState([])
  const [siteId, setSiteId] = useState(null)
  const [sites, setSites] = useState([])

  const [newSlot, setNewSlot] = useState({
    slotNumber: '',
    type: 'normal',
    rate: 100
  })

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      const res = await api.get('/parking/sites/')
      setSites(res.data || [])
      if (res.data?.length) {
        setSiteId(res.data[0].id)
        await fetchSlots(res.data[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSlots = async (currentSiteId = siteId) => {
    if (!currentSiteId) return
    try {
      const res = await api.get(`/parking/sites/${currentSiteId}/slots/`)
      const mapped = (res.data || []).map(s => {
        let status = 'Available'
        if (s.is_occupied) status = 'Occupied'
        else if (s.is_reserved) status = 'Reserved'

        return {
          id: s.id,
          slotNumber: s.slot_number,
          type: s.slot_type || 'normal',
          status: status,
          rate: parseFloat(s.price_per_hour) || 50
        }
      })
      mapped.sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true, sensitivity: 'base' }))
      setSlots(mapped)
    } catch (err) {
      console.error(err)
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'bg-green-100 text-green-700 border-green-200'
      case 'Occupied': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'Reserved': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTypeIcon = (type) => type.toLowerCase() === 'vip' ? <Car className="w-4 h-4 text-purple-600" /> : <Car className="w-4 h-4 text-gray-600" />

  const handleAddSlot = async () => {
    if (!newSlot.slotNumber) return alert('Please enter slot number')
    try {
      await api.post('/parking/slots/', {
        parking_site: siteId,
        slot_number: newSlot.slotNumber.trim().toUpperCase(),
        slot_type: newSlot.type,
        is_occupied: false,
        is_reserved: false,
        price_per_hour: parseFloat(newSlot.rate) || 50
      })
      setNewSlot({ slotNumber: '', type: 'normal', rate: 100 })
      setIsAddingSlot(false)
      await fetchSlots()
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleDeleteSlot = async (id) => {
    if (confirm('Delete this slot?')) {
      try {
        await api.delete(`/parking/slots/${id}/`)
        await fetchSlots()
      } catch (err) {
        alert('Error: ' + err.message)
      }
    }
  }

  const handleEditSlot = (slot) => setEditingSlot(slot)

  const handleSaveEdit = async () => {
    try {
      await api.patch(`/parking/slots/${editingSlot.id}/`, {
        slot_number: editingSlot.slotNumber.trim().toUpperCase(),
        slot_type: editingSlot.type,
        is_occupied: editingSlot.status === 'Occupied',
        is_reserved: editingSlot.status === 'Reserved',
        price_per_hour: parseFloat(editingSlot.rate) || 50
      })
      setEditingSlot(null)
      await fetchSlots()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slot Configuration</h1>
          <p className="text-gray-600 mt-1">Manage parking slots for your site</p>
        </div>
        <button onClick={() => setIsAddingSlot(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add New Slot
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
              await fetchSlots(selectedId)
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
        <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-sm text-gray-500">Total Slots</p><p className="text-2xl font-bold text-gray-900 mt-1">{slots.length}</p></div>
        <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-sm text-gray-500">Available</p><p className="text-2xl font-bold text-green-600 mt-1">{slots.filter(s => s.status === 'Available').length}</p></div>
        <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-sm text-gray-500">Occupied</p><p className="text-2xl font-bold text-orange-600 mt-1">{slots.filter(s => s.status === 'Occupied').length}</p></div>
        <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-sm text-gray-500">Reserved</p><p className="text-2xl font-bold text-blue-600 mt-1">{slots.filter(s => s.status === 'Reserved').length}</p></div>
      </div>

      {isAddingSlot && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Slot</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-sm text-gray-500 font-medium">Slot Number</label><input type="text" placeholder="e.g. A5" value={newSlot.slotNumber} onChange={(e) => setNewSlot({...newSlot, slotNumber: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="text-sm text-gray-500 font-medium">Type</label><select value={newSlot.type} onChange={(e) => setNewSlot({...newSlot, type: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="normal">Normal</option><option value="vip">VIP</option><option value="disabled">Disabled</option></select></div>
            <div><label className="text-sm text-gray-500 font-medium">Rate/Hour (Rs.)</label><input type="number" value={newSlot.rate} onChange={(e) => setNewSlot({...newSlot, rate: parseInt(e.target.value)})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddSlot} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><Save className="w-4 h-4" /> Add Slot</button>
            <button onClick={() => setIsAddingSlot(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"><X className="w-4 h-4" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Parking Slots</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {slots.map(slot => (
            <div key={slot.id} className={`p-4 rounded-lg border-2 ${getStatusColor(slot.status)} hover:shadow-md transition-shadow`}>
              {editingSlot?.id === slot.id? (
                <div className="space-y-2">
                  <input type="text" value={editingSlot.slotNumber} onChange={(e) => setEditingSlot({...editingSlot, slotNumber: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" />
                  <select value={editingSlot.type} onChange={(e) => setEditingSlot({...editingSlot, type: e.target.value})} className="w-full px-2 py-1 text-sm border rounded"><option value="normal">Normal</option><option value="vip">VIP</option><option value="disabled">Disabled</option></select>
                  <select value={editingSlot.status} onChange={(e) => setEditingSlot({...editingSlot, status: e.target.value})} className="w-full px-2 py-1 text-sm border rounded"><option>Available</option><option>Occupied</option><option>Reserved</option></select>
                  <input type="number" value={editingSlot.rate} onChange={(e) => setEditingSlot({...editingSlot, rate: parseInt(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                  <div className="flex gap-1"><button onClick={handleSaveEdit} className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded">Save</button><button onClick={() => setEditingSlot(null)} className="flex-1 px-2 py-1 bg-gray-500 text-white text-xs rounded">Cancel</button></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2"><span className="font-bold text-lg">{slot.slotNumber}</span>{getTypeIcon(slot.type)}</div>
                  <p className="text-xs font-medium capitalize">{slot.type}</p>
                  <p className="text-xs mt-1">Rs. {slot.rate}/hr</p>
                  <p className="text-xs mt-2 font-medium">{slot.status}</p>
                  <div className="flex gap-1 mt-3">
                    <button onClick={() => handleEditSlot(slot)} className="flex-1 p-1 bg-white/50 hover:bg-white rounded transition-colors"><Edit2 className="w-3 h-3 mx-auto" /></button>
                    <button onClick={() => handleDeleteSlot(slot.id)} className="flex-1 p-1 bg-white/50 hover:bg-white rounded transition-colors"><Trash2 className="w-3 h-3 mx-auto text-red-600" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SlotConfig