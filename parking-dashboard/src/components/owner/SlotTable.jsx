// src/components/owner/SlotTable.jsx
import React from "react";

const SlotTable = ({ slots }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "Booked":
        return "bg-orange-100 text-orange-800";
      case "Disabled":
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
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Slot Number</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Price (₹)</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {slots.map((slot) => (
            <tr key={slot.id}>
              <td className="px-4 py-2">{slot.number}</td>
              <td className="px-4 py-2">{slot.type}</td>
              <td className="px-4 py-2">{slot.price}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-sm font-semibold ${getStatusColor(slot.status)}`}
                >
                  {slot.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SlotTable;