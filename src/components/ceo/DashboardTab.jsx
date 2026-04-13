"use client";

import { useState, useEffect } from "react";
import {
  FaUsers,
  FaCalendarCheck,
  FaBriefcase,
  FaDollarSign,
  FaCheckCircle,
  FaClock,
  FaArrowUp,
} from "react-icons/fa";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const attendanceData = [
  { month: "Jan", value: 96, title: "Attendance Rate", unit: "%" },
  { month: "Feb", value: 98, title: "Attendance Rate", unit: "%" },
  { month: "Mar", value: 92, title: "Attendance Rate", unit: "%" },
  { month: "Apr", value: 100, title: "Attendance Rate", unit: "%" },
  { month: "May", value: 97, title: "Attendance Rate", unit: "%" },
  { month: "Jun", value: 99, title: "Attendance Rate", unit: "%" },
];

const payrollData = [
  { month: "Jan", value: 450000, title: "Payroll Cost", unit: "$" },
  { month: "Feb", value: 470000, title: "Payroll Cost", unit: "$" },
  { month: "Mar", value: 460000, title: "Payroll Cost", unit: "$" },
  { month: "Apr", value: 490000, title: "Payroll Cost", unit: "$" },
  { month: "May", value: 510000, title: "Payroll Cost", unit: "$" },
  { month: "Jun", value: 530000, title: "Payroll Cost", unit: "$" },
];

const COLORS = ["#05DC7F", "#04c56f", "#03a85f", "#028b4f"];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-black/90 backdrop-blur-md px-4 py-2 rounded-lg border border-[#05DC7F]/30 shadow-lg">
      <p className="text-gray-400 text-xs">{data.title || label}</p>
      <p className="text-white font-semibold">
        {payload[0].value.toLocaleString()} {data.unit || ""}
      </p>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="flex justify-between items-center p-5 rounded-xl backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_8px_rgba(5,220,127,0.25)] hover:border-[#05DC7F]/45 hover:shadow-[0_0_18px_rgba(5,220,127,0.45)] transition-all duration-300">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <h3 className="text-white text-3xl font-bold">{value}</h3>
      </div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#05DC7F]/15 border border-[#05DC7F]/40">
        {icon}
      </div>
    </div>
  );
}

function ChartBox({ title, children }) {
  return (
    <div className="p-6 rounded-2xl backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_10px_rgba(5,220,127,0.25)] w-full">
      <h3 className="text-white text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Activity({ icon, title, time }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center p-4 rounded-xl border border-[#05DC7F]/20 backdrop-blur-sm gap-2 sm:gap-0">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-white">{title}</span>
      </div>
      <span className="text-gray-400 text-sm">{time}</span>
    </div>
  );
}

export default function DashboardTab() {
  const [stats, setStats] = useState({
    total_employees: "...",
    total_departments: "...",
    active_openings: "...",
    pipeline: { applied: 0, shortlisted: 0, interviews: 0, hired: 0 },
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(
          "http://127.0.0.1:8000/recruitment/dashboard-stats",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Stats fetch error:", err);
      }
    };
    fetchStats();
  }, []);

  // ──── Pipeline data real ────
  const pipelineData = [
    {
      name: "Applied",
      value: stats.pipeline?.applied || 0,
      title: "Applied Candidates",
      unit: "",
    },
    {
      name: "Shortlisted",
      value: stats.pipeline?.shortlisted || 0,
      title: "Shortlisted Candidates",
      unit: "",
    },
    {
      name: "Interviews",
      value: stats.pipeline?.interviews || 0,
      title: "Interviews Scheduled",
      unit: "",
    },
    {
      name: "Hired",
      value: stats.pipeline?.hired || 0,
      title: "Hired Candidates",
      unit: "",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* ===== TOP STATS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={stats.total_employees}
          icon={<FaUsers className="text-[#05DC7F]" />}
        />
        <StatCard
          title="Departments"
          value={stats.total_departments}
          icon={<FaCalendarCheck className="text-[#05DC7F]" />}
        />
        <StatCard
          title="Active Openings"
          value={stats.active_openings}
          icon={<FaBriefcase className="text-[#05DC7F]" />}
        />
        <StatCard
          title="Monthly Payroll"
          value="$505K"
          icon={<FaDollarSign className="text-[#05DC7F]" />}
        />
      </div>

      {/* ===== ROW 1 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartBox title="Attendance Trends">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis domain={[80, 100]} stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#05DC7F"
                  strokeWidth={3}
                  dot={{ fill: "#05DC7F" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartBox>

        <ChartBox title="Payroll Costs">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollData}>
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#05DC7F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartBox>
      </div>

      {/* ===== ROW 2 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartBox title="Recruitment Pipeline">
          <div className="flex flex-col items-center gap-6">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={pipelineData}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={90}
                  >
                    {pipelineData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              {pipelineData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[i] }}
                  />
                  <span className="text-gray-300 text-sm">
                    {item.name}:{" "}
                    <span className="text-white font-semibold">
                      {item.value}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartBox>

        <ChartBox title="Recent Activity">
          <div className="flex flex-col gap-4">
            <Activity
              icon={<FaCheckCircle className="text-[#05DC7F]" />}
              title="New Job Posted"
              time="2 hours ago"
            />
            <Activity
              icon={<FaArrowUp className="text-blue-400" />}
              title="Interview Scheduled"
              time="4 hours ago"
            />
            <Activity
              icon={<FaClock className="text-yellow-400" />}
              title="Leave Request"
              time="6 hours ago"
            />
          </div>
        </ChartBox>
      </div>
    </div>
  );
}
