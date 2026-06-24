// src/components/owner/RevenueChart.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const RevenueChart = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded shadow border mt-6">
      <h3 className="text-lg font-semibold mb-4">Revenue Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => `₹${value}`} />
          <Line type="monotone" dataKey="revenue" stroke="#4CAF50" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;