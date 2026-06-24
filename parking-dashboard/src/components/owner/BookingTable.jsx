// src/components/owner/BookingTable.jsx
import React from "react";

const BookingTable = ({ bookings, onAccept, onDecline }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Confirmed":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "";
    }
  };

  return (
    <div className="bg-white shadow rounded border p-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">User</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Slot</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="px-4 py-2">{booking.user}</td>
              <td className="px-4 py-2">{booking.slot}</td>
              <td className="px-4 py-2">{booking.date}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}
                >
                  {booking.status}
                </span>
              </td>
              <td className="px-4 py-2 space-x-2">
                {booking.status === "Pending" && (
                  <>
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded"
                      onClick={() => onAccept(booking.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded"
                      onClick={() => onDecline(booking.id)}
                    >
                      Decline
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookingTable;