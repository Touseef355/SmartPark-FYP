import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { Pencil, Trash2, Plus, X, Building2, MapPin, Phone, Mail, DollarSign, Eye } from 'lucide-react'
import { getUser } from '../../utils/auth'

export default function SiteManagement() {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedSite, setSelectedSite] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    total_slots: '',
    price_per_hour: '',
    total_floors: '2',
    opening_time: '06:00',
    closing_time: '23:00',
    contact_number: '',
    email: '',
    status: 'active'
  })

  useEffect(() => {
    fetchSites()

    // Real-time subscription - Database me change hotay hi UI update
    const channel = supabase
     .channel('sites_changes')
     .on('postgres_changes',
        { event: '*', schema: 'public', table: 'parking_sites' },
        () => {
          fetchSites()
        }
      )
     .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchSites = async () => {
    try {
      setLoading(true)
      const { user_id } = getUser()
      const query = supabase.from('parking_sites').select('*')
      if (user_id) {
        query.eq('owner_id', user_id)
      }
      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setSites(data || [])
    } catch (error) {
      console.error('Error fetching sites:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setIsEditing(false)
    setSelectedSite(null)
    setFormData({
      name: '',
      address: '',
      total_slots: '',
      price_per_hour: '',
      total_floors: '2',
      opening_time: '06:00',
      closing_time: '23:00',
      contact_number: '',
      email: '',
      status: 'active'
    })
    setShowModal(true)
  }

  const handleEdit = (site) => {
    setIsEditing(true)
    setSelectedSite(site)
    setFormData({
      name: site.name || '',
      address: site.address || '',
      total_slots: site.total_slots || '',
      price_per_hour: site.price_per_hour || '',
      total_floors: site.total_floors || '2',
      opening_time: site.opening_time || '06:00',
      closing_time: site.closing_time || '23:00',
      contact_number: site.contact_number || '',
      email: site.email || '',
      status: site.status || 'active'
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this site?')) return

    try {
      const { error } = await supabase
  .from('parking_sites')
  .delete()
  .eq('id', id)

      if (error) throw error
      alert('Site deleted successfully!')
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { user_id } = getUser()
      const siteData = {
        name: formData.name,
        address: formData.address,
        total_slots: parseInt(formData.total_slots),
        price_per_hour: parseFloat(formData.price_per_hour),
        total_floors: parseInt(formData.total_floors),
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        contact_number: formData.contact_number,
        email: formData.email,
        status: formData.status
      }

      if (isEditing) {
        const { error } = await supabase
          .from('parking_sites')
          .update(siteData)
          .eq('id', selectedSite.id)

        if (error) throw error
        alert('Site updated successfully!')
      } else {
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
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const getStats = () => {
    const total = sites.length
    const active = sites.filter(s => s.status === 'active').length
    const inactive = total - active
    const totalRevenue = sites.reduce((sum, s) => sum + (s.price_per_hour * s.total_slots * 8), 0)

    return { total, active, inactive, totalRevenue }
  }

  const stats = getStats()

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Site Management</h1>
          <p className="text-gray-600 mt-1">Manage all your parking sites</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Add New Site
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Sites</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-3xl font-bold text-red-600">{stats.inactive}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Est. Daily Revenue</p>
          <p className="text-3xl font-bold text-blue-600">Rs. {(stats.totalRevenue / 1000).toFixed(1)}K</p>
        </div>
      </div>

      {/* TABLE - Cashiers jaisa */}
      {sites.length === 0? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No parking sites found</p>
          <button
            onClick={handleAddNew}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Add Your First Site
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">SITE</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">CONTACT</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">SLOTS</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">RATE/HR</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">STATUS</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building2 className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{site.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={12} />
                          {site.address?.substring(0, 30)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-gray-900 flex items-center gap-1">
                        <Mail size={14} />
                        {site.email || 'N/A'}
                      </p>
                      <p className="text-gray-500 flex items-center gap-1 mt-1">
                        <Phone size={14} />
                        {site.contact_number || 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {site.total_slots} Slots
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-green-600 font-semibold">Rs. {site.price_per_hour}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      site.status === 'active'
                       ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {site.status === 'active'? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/owner/site/${site.id}`)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(site)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                        title="Edit"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(site.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL - Chota + Blur */}
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
                    placeholder="123 Main Street, Islamabad"
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
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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