// src/components/owner/CashierTable.jsx
import React from "react";

const CashierTable = ({ cashiers, onEdit, onDelete }) => {
  return (
    <div className="bg-white shadow rounded border p-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Role</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {cashiers.map((cashier) => (
            <tr key={cashier.id}>
              <td className="px-4 py-2">{cashier.name}</td>
              <td className="px-4 py-2">{cashier.email}</td>
              <td className="px-4 py-2">{cashier.role}</td>
              <td className="px-4 py-2 space-x-2">
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                  onClick={() => onEdit(cashier.id)}
                >
                  Edit
                </button>
                <button
                  className="px-3 py-1 bg-red-600 text-white rounded"
                  onClick={() => onDelete(cashier.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CashierTable;