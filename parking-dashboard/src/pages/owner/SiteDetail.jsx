import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase'
import { Pencil, Building2, Clock, Phone, Mail, MapPin, DollarSign, X, TrendingUp, Banknote, Car, Star, Plus } from 'lucide-react'
import { getUser } from '../../utils/auth'

export default function SiteDetail() {
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    total_slots: '',
    price_per_hour: '',
    total_floors: '2',
    opening_time: '06:00',
    closing_time: '23:00',
    contact_number: '',
    email: ''
  })

  const [stats] = useState({
    avgOccupancy: '85%',
    todayRevenue: 'Rs. 12.4K',
    vehiclesToday: '156',
    customerRating: '4.8'
  })

  const { id } = useParams()

  useEffect(() => {
    fetchSiteDetails()
  }, [id])

  const fetchSiteDetails = async () => {
    try {
      if (!id) return
      const { data, error } = await supabase
    .from('parking_sites')
    .select('*')
    .eq('id', id)
    .single()

      if (error) throw error
      setSite(data)
    } catch (error) {
      console.error('Error fetching site details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setFormData({
      name: site.name || '',
      address: site.address || '',
      total_slots: site.total_slots || '',
      price_per_hour: site.price_per_hour || '',
      total_floors: site.total_floors || '2',
      opening_time: site.opening_time || '06:00',
      closing_time: site.closing_time || '23:00',
      contact_number: site.contact_number || '',
      email: site.email || ''
    })
    setShowModal(true)
  }

  const handleAddNew = () => {
    setIsEditing(false)
    setFormData({
      name: '',
      address: '',
      total_slots: '',
      price_per_hour: '',
      total_floors: '2',
      opening_time: '06:00',
      closing_time: '23:00',
      contact_number: '',
      email: ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const siteData = {
        name: formData.name,
        address: formData.address,
        total_slots: parseInt(formData.total_slots),
        price_per_hour: parseFloat(formData.price_per_hour),
        total_floors: parseInt(formData.total_floors),
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        contact_number: formData.contact_number,
        email: formData.email
      }

      if (isEditing) {
        const { error } = await supabase
     .from('parking_sites')
     .update(siteData)
     .eq('id', site.id)

        if (error) throw error
        alert('Site updated successfully!')
      } else {
        const { user_id } = getUser()
        if (user_id) {
          siteData.owner_id = user_id
        }
        const { error } = await supabase
     .from('parking_sites')
     .insert([siteData])

        if (error) throw error
        alert('New site added successfully!')
      }

      setShowModal(false)
      fetchSiteDetails()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!site) return (
    <div className="p-6">
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg mb-4">No site found</p>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 mx-auto"
        >
          <Plus size={20} />
          Add Your First Site
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Site Management</h1>
          <p className="text-gray-600 mt-1">Manage your parking site details and configuration</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xs">✓</span>
            </div>
            <span className="text-green-600 font-medium">Active</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddNew}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus size={18} />
            Add New Site
          </button>
          <button
            onClick={handleEdit}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Pencil size={18} />
            Edit Details
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Site Name</p>
              <p className="text-lg font-semibold">{site.name}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={16} />
                <span>Address</span>
              </div>
              <p className="mt-1">{site.address || 'N/A'}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone size={16} />
                <span>Contact Number</span>
              </div>
              <p className="mt-1">{site.contact_number || 'N/A'}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail size={16} />
                <span>Email</span>
              </div>
              <p className="mt-1">{site.email || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold">Operational Details</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total Slots</p>
              <p className="text-2xl font-bold">{site.total_slots || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total Floors</p>
              <p className="text-2xl font-bold">{site.total_floors || 2}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Car Slots</p>
              <p className="text-2xl font-bold text-blue-600">60</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Bike Slots</p>
              <p className="text-2xl font-bold text-green-600">25</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Opening Time</p>
              <p className="font-semibold">{site.opening_time || '06:00'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Closing Time</p>
              <p className="font-semibold">{site.closing_time || '23:00'}</p>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign size={16} />
              <span>Rate Per Hour</span>
            </div>
            <p className="text-2xl font-bold text-green-600">Rs. {site.price_per_hour || 0}/hr</p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.avgOccupancy}</p>
            <p className="text-sm text-gray-600">Avg Occupancy</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <Banknote className="text-green-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.todayRevenue}</p>
            <p className="text-sm text-gray-600">Today's Revenue</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <Car className="text-purple-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.vehiclesToday}</p>
            <p className="text-sm text-gray-600">Vehicles Today</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <Star className="text-orange-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.customerRating}★</p>
            <p className="text-sm text-gray-600">Customer Rating</p>
          </div>
        </div>
      </div>

      {/* SMALL MODAL WITH BLUR - Ye naya hai */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">
                {isEditing? 'Edit Site Details' : 'Add New Site'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h- overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Site Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="SmartPark Downtown"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Total Slots *</label>
                  <input
                    type="number"
                    value={formData.total_slots}
                    onChange={(e) => setFormData({...formData, total_slots: e.target.value})}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="85"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Total Floors</label>
                  <input
                    type="number"
                    value={formData.total_floors}
                    onChange={(e) => setFormData({...formData, total_floors: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Price/Hour *</label>
                  <input
                    type="number"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({...formData, price_per_hour: e.target.value})}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Contact</label>
                  <input
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+92 300 1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({...formData, opening_time: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({...formData, closing_time: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="downtown@smartpark.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  {isEditing? 'Update Site' : 'Add Site'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}