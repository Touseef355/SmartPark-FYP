// src/components/owner/ReportsTable.jsx
import React from "react";

const ReportsTable = ({ reports }) => {
  return (
    <div className="bg-white shadow rounded border p-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">User</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Slot</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Payment (₹)</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {reports.map((report) => (
            <tr key={report.id}>
              <td className="px-4 py-2">{report.user}</td>
              <td className="px-4 py-2">{report.slot}</td>
              <td className="px-4 py-2">{report.payment}</td>
              <td className="px-4 py-2">{report.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportsTable;