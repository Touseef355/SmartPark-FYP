// src/components/admin/AdminSidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";

const AdminSidebar = () => {
  const navigate = useNavigate();

  const menuItems = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Owner Accounts", path: "/admin/owner-accounts" },
    { name: "Parking Sites", path: "/admin/parking-sites" },
    { name: "Payments", path: "/admin/payments" },
    { name: "Queries", path: "/admin/queries" },
    { name: "Reports", path: "/admin/reports" },
    { name: "Slot Configuration", path: "/admin/slot-config" },
    { name: "System Logs", path: "/admin/system-logs" },
    { name: "User Accounts", path: "/admin/user-accounts" },
    { name: "AI Monitor", path: "/admin/ai-monitor" },
    { name: "Refunds", path: "/admin/refunds" },
    { name: "Peak Hours", path: "/admin/peak-hours" },
    { name: "Settings", path: "/admin/settings" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-[#1B2430] text-white flex flex-col">
      <div className="p-6 text-lg font-bold border-b border-gray-700">
        Parkroo Admin
      </div>
      <nav className="flex-1 mt-4 overflow-y-auto">
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
        <button
          onClick={handleLogout}
          className="w-full py-2 bg-red-600 rounded"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;