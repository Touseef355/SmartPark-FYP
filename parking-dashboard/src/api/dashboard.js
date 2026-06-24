import api from './axios'

// Slot status
export async function getSlotStats(){
    const response =  await api.get('/parking/sites/')
    return response.data
}

export async function getActiveBookings(){
    const response = await api.get('/bookings/')
    return response.data
}

export async function getAiLogs(){
    const response = await api.get('/ai/logs')
    return response.data
}