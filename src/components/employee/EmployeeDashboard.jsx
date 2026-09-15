"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../layout/Layout";
import { logout } from "../../utils/auth";

import DashboardTab from "./DashboardTab";
import EmployeeAttendance from "./EmployeeAttendance";
import EmployeeInterviewsTab from "./EmployeeInterviewsTab";
import EmployeeLeave from "./EmployeeLeave";
import EmployeePayroll from "./EmployeePayroll";
import MyProfile from "./MyProfile";
import HRChatbot from "./HrChatBot";

import {
  FaTachometerAlt,
  FaUserAlt,
  FaFileAlt,
  FaDollarSign,
  FaSignOutAlt,
  FaCalendarCheck,
  FaIdBadge,
} from "react-icons/fa";

const API = "http://127.0.0.1:8000";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Dashboard");

  // ⚠ Safha khulte hi ek sawal: onboarding hui ya nahi.
  //
  // `localStorage` par bharosa nahi kiya ja sakta — wo purana ho
  // sakta hai (CEO ne kisi aur device se account daal diya), aur wo
  // shakhs khud bhi badal sakta hai. Jawab server se aata hai.
  //
  // Yeh rokawat NAHI hai (rokna backend 428 se karta hai) — yeh us
  // rokawat ka saaf paighaam hai, taake safha 428 ke erroron se
  // bhara hua na dikhe.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/employee/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        localStorage.setItem(
          "profile_complete", data.onboarding_complete ? "1" : "0");
        if (!data.onboarding_complete) navigate("/employee/onboarding");
      } catch {
        /* server band hai — baqi safha apna error khud dikhata hai */
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  // ──── Comes from localStorage at login — used to be hardcoded ────
  const fullName = localStorage.getItem("full_name") || "Employee";
  const department = localStorage.getItem("department") || "Employee";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");



  const tabs = [
    { name: "Dashboard", icon: <FaTachometerAlt size={20} /> },
    { name: "Attendance", icon: <FaUserAlt size={20} /> },
    { name: "Interviews", icon: <FaCalendarCheck size={20} /> },
    { name: "Leave", icon: <FaFileAlt size={20} /> },
    { name: "Payroll", icon: <FaDollarSign size={20} /> },
    { name: "My Profile", icon: <FaIdBadge size={20} /> },
  ];

  const tabComponents = {
    Dashboard: <DashboardTab />,
    Attendance: <EmployeeAttendance />,
    Interviews: <EmployeeInterviewsTab />,
    Leave: <EmployeeLeave />,
    Payroll: <EmployeePayroll />,
    "My Profile": <MyProfile />,
  };

  return (
    <>
      <Layout
        sidebar={tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center w-full gap-3 p-3 mb-2 rounded-xl transition-all duration-300 ${
              activeTab === tab.name
                ? "text-[#05DC7F] border border-[#05DC7F]/45 shadow-[0_0_10px_rgba(5,220,127,0.4)]"
                : "text-white/65 hover:text-[#05DC7F] hover:shadow-[0_0_8px_rgba(5,220,127,0.35)]"
            }`}
          >
            {tab.icon}
            <span className="tracking-wide whitespace-nowrap text-sm">
              {tab.name}
            </span>
          </button>
        ))}
        navbar={
          <div className="flex justify-between items-center mb-6 p-4 rounded-xl border border-[#05DC7F]/35 shadow-[0_0_10px_rgba(5,220,127,0.35)] backdrop-blur-sm flex-wrap md:flex-nowrap">
            <h2 className="text-white text-xl font-semibold tracking-wider whitespace-nowrap">
              {activeTab}
            </h2>

            <div className="flex items-center gap-4 mt-2 md:mt-0">
              <div className="text-right">
                <p className="text-white font-medium">{fullName}</p>
                <p className="text-white/55 text-xs">{department}</p>
              </div>

              <div className="w-10 h-10 rounded-full bg-[#05DC7F] text-black font-bold flex items-center justify-center shadow-[0_0_10px_rgba(5,220,127,0.4)]">
                {initials || "E"}
              </div>

              <button
                onClick={logout}
                title="Logout"
                className="text-[#05DC7F]/65 hover:text-white transition"
              >
                <FaSignOutAlt size={22} />
              </button>
            </div>
          </div>
        }
        content={tabComponents[activeTab]}
      />
      <HRChatbot />
    </>
  );
}
