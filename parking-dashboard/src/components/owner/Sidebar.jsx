// src/components/owner/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const menuItems = [
    { name: "Dashboard", path: "/owner/dashboard" },
    { name: "My Parking Site", path: "/owner/my-parking-site" },
    { name: "Bookings", path: "/owner/bookings" },
    { name: "Revenue", path: "/owner/revenue" },
    { name: "Cashier Accounts", path: "/owner/cashier-accounts" },
    { name: "Reports", path: "/owner/reports" },
    { name: "Settings", path: "/owner/settings" },
  ];

  return (
    <aside className="w-64 bg-[#1B2430] text-white flex flex-col">
      <div className="p-6 text-lg font-bold border-b border-gray-700">
        Parkroo
      </div>
      <nav className="flex-1 mt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `block px-6 py-3 hover:bg-[#2C3E50] ${
                isActive ? "bg-[#2C3E50]" : ""
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-6 border-t border-gray-700">
        <button className="w-full py-2 bg-red-600 rounded">Logout</button>
      </div>
    </aside>
  );
};

export default Sidebar;