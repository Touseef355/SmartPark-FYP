import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { Grid3x3, Plus, Edit2, Trash2, Save, X, Car, Bike } from 'lucide-react'
import { getUser } from '../../utils/auth'

const SlotConfig = () => {
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [isAddingSlot, setIsAddingSlot] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [slots, setSlots] = useState([])
  const [siteId, setSiteId] = useState(null)
  const [siteData, setSiteData] = useState(null)
  const [sites, setSites] = useState([])

  const [newSlot, setNewSlot] = useState({
    slotNumber: '',
    floor: 1,
    type: 'Car',
    rate: 100
  })

  useEffect(() => {
    fetchSiteAndSlots()
    const channel = supabase
    .channel('slots_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' },
        () => fetchSlots()
      )
    .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchSiteAndSlots = async () => {
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
      setSiteData(ownerSites[0])
      setNewSlot(s => ({...s, rate: ownerSites[0].price_per_hour || 100 }))
      await fetchSlots(ownerSites[0].id, ownerSites[0])
    }
  }

  const fetchSlots = async (currentSiteId = siteId, currentSiteData = siteData) => {
    if (!currentSiteId) return
    const { data } = await supabase.from('parking_slots').select('*').eq('site_id', currentSiteId)

    const mapped = (data || []).map(s => ({
      id: s.id,
      slotNumber: s.slot_number,
      floor: s.floor,
      type: s.type || 'Car',
      status: s.status || 'Available',
      rate: currentSiteData?.price_per_hour || 100
    }))

    mapped.sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true, sensitivity: 'base' }))
    setSlots(mapped)
  }

  const floors = siteData?.total_floors? Array.from({ length: siteData.total_floors }, (_, i) => i + 1) : [1, 2]
  const filteredSlots = slots.filter(slot => slot.floor === selectedFloor)

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'bg-green-100 text-green-700 border-green-200'
      case 'Occupied': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'Reserved': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTypeIcon = (type) => type === 'Car'? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />

  const handleAddSlot = async () => {
    if (!newSlot.slotNumber) return alert('Please enter slot number')

    const { error } = await supabase.from('parking_slots').insert([{
      site_id: siteId,
      slot_number: newSlot.slotNumber.trim().toUpperCase(),
      floor: newSlot.floor,
      type: newSlot.type,
      status: 'Available'
      // rate_per_hour hata diya - column exist nahi karta
    }])

    if (error) return alert('Error: ' + error.message)

    setNewSlot({ slotNumber: '', floor: selectedFloor, type: 'Car', rate: siteData?.price_per_hour || 100 })
    setIsAddingSlot(false)
    await fetchSlots()
  }

  const handleDeleteSlot = async (id) => {
    if (confirm('Delete this slot?')) {
      await supabase.from('parking_slots').delete().eq('id', id)
      await fetchSlots()
    }
  }

  const handleEditSlot = (slot) => setEditingSlot(slot)

  const handleSaveEdit = async () => {
    await supabase.from('parking_slots').update({
      slot_number: editingSlot.slotNumber.trim().toUpperCase(),
      status: editingSlot.status
    }).eq('id', editingSlot.id)

    setEditingSlot(null)
    await fetchSlots()
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slot Configuration</h1>
          <p className="text-gray-600 mt-1">Manage parking slots for each floor</p>
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
              const siteObj = sites.find(s => String(s.id) === String(selectedId))
              setSiteId(selectedId)
              setSiteData(siteObj)
              setSelectedFloor(1)
              setNewSlot(s => ({...s, rate: siteObj?.price_per_hour || 100 }))
              await fetchSlots(selectedId, siteObj)
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Select Floor:</span>
          <div className="flex gap-2">
            {floors.map(floor => (
              <button key={floor} onClick={() => setSelectedFloor(floor)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedFloor === floor? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Floor {floor}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-sm text-gray-500">Total Slots</p><p className="text-2xl font-bold text-gray-900 mt-1">{filteredSlots.length}</p></div>
        <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-sm text-gray-500">Available</p><p className="text-2xl font-bold text-green-600 mt-1">{filteredSlots.filter(s => s.status === 'Available').length}</p></div>
        <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-sm text-gray-500">Occupied</p><p className="text-2xl font-bold text-orange-600 mt-1">{filteredSlots.filter(s => s.status === 'Occupied').length}</p></div>
        <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-sm text-gray-500">Reserved</p><p className="text-2xl font-bold text-blue-600 mt-1">{filteredSlots.filter(s => s.status === 'Reserved').length}</p></div>
      </div>

      {isAddingSlot && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Slot</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="text-sm text-gray-500 font-medium">Slot Number</label><input type="text" placeholder="e.g. A5" value={newSlot.slotNumber} onChange={(e) => setNewSlot({...newSlot, slotNumber: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="text-sm text-gray-500 font-medium">Floor</label><select value={newSlot.floor} onChange={(e) => setNewSlot({...newSlot, floor: parseInt(e.target.value)})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">{floors.map(f => <option key={f} value={f}>Floor {f}</option>)}</select></div>
            <div><label className="text-sm text-gray-500 font-medium">Type</label><select value={newSlot.type} onChange={(e) => setNewSlot({...newSlot, type: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="Car">Car</option><option value="Bike">Bike</option></select></div>
            <div><label className="text-sm text-gray-500 font-medium">Rate/Hour</label><input type="number" value={newSlot.rate} onChange={(e) => setNewSlot({...newSlot, rate: parseInt(e.target.value)})} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddSlot} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><Save className="w-4 h-4" /> Add Slot</button>
            <button onClick={() => setIsAddingSlot(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"><X className="w-4 h-4" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Floor {selectedFloor} Slots</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredSlots.map(slot => (
            <div key={slot.id} className={`p-4 rounded-lg border-2 ${getStatusColor(slot.status)} hover:shadow-md transition-shadow`}>
              {editingSlot?.id === slot.id? (
                <div className="space-y-2">
                  <input type="text" value={editingSlot.slotNumber} onChange={(e) => setEditingSlot({...editingSlot, slotNumber: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" />
                  <select value={editingSlot.status} onChange={(e) => setEditingSlot({...editingSlot, status: e.target.value})} className="w-full px-2 py-1 text-sm border rounded"><option>Available</option><option>Occupied</option><option>Reserved</option></select>
                  <div className="flex gap-1"><button onClick={handleSaveEdit} className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded">Save</button><button onClick={() => setEditingSlot(null)} className="flex-1 px-2 py-1 bg-gray-500 text-white text-xs rounded">Cancel</button></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2"><span className="font-bold text-lg">{slot.slotNumber}</span>{getTypeIcon(slot.type)}</div>
                  <p className="text-xs font-medium">{slot.type}</p>
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