// src/components/owner/StatsCard.jsx
import React from "react";

const StatsCard = ({ title, value }) => {
  return (
    <div className="p-4 bg-white shadow rounded border">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
};

export default StatsCard;