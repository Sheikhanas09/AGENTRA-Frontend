"use client";

import { useEffect, useState } from "react";
import {
  FaUserPlus,
  FaKey,
  FaSync,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaMoneyBillWave,
} from "react-icons/fa";

function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function CreateUser() {
  // ──── What this company already calls things ────
  // The department field used to be a dropdown written into this file,
  // and it mixed the two ideas up: "Frontend Developer" sat in it beside
  // "Finance". Every employee created that way put a job title in the
  // department column, and the console then reported "the Backend
  // Developer department has 2 people".
  //
  // Nothing is listed here now. Both fields suggest the values the
  // company is already using, and accept a new one typed in — so the
  // first department a company creates is theirs, not ours.
  const [known, setKnown] = useState({ departments: [], designations: [] });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    joiningDate: "",
    password: "",
    // ──── Salary — set at hiring time ────
    baseSalary: "",
    houseAllowance: "",
    transportAllowance: "",
    medicalAllowance: "",
    otherAllowances: "",
  });

  const [autoPassword, setAutoPassword] = useState(true);
  const [createdUsers, setCreatedUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://127.0.0.1:8000/ceo/employees", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.employees) return;
        const uniq = (key) =>
          [...new Set(data.employees.map((e) => e[key]).filter(Boolean))].sort();
        setKnown({
          departments: uniq("department"),
          designations: uniq("designation"),
        });
      })
      .catch(() => {});
  }, []);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState(""); // employee created, salary not

  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ──── API Call ────
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError("");
    setWarning("");

    if (!formData.name || !formData.email)
      return setError("Name and email are required.");

    const finalPassword = autoPassword ? generatePassword() : formData.password;
    if (!finalPassword) return setError("Password is required.");

    // Base salary is optional, but if given it must be valid
    const base = Number(formData.baseSalary);
    if (formData.baseSalary !== "" && !(base > 0))
      return setError("Base salary must be greater than zero.");

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/ceo/create-employee",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: formData.name,
            email: formData.email,
            phone: formData.phone,
            department: formData.department,
            // What they do inside the department. Separate from it on
            // purpose: the console counts people BY department, and a
            // job title in that column produces "the Backend Developer
            // department has 2 people".
            designation: formData.designation || null,
            joining_date:
              formData.joiningDate || new Date().toISOString().split("T")[0],
            password: finalPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "The employee could not be created.");
        setLoading(false);
        return;
      }

      // ──── The salary structure ────
      // The employee already exists. If this call fails we do not roll
      // them back — we simply tell the CEO to set the salary from the
      // Payroll tab. Otherwise the person is created and it still says
      // "failed".
      let salarySaved = false;
      if (base > 0) {
        try {
          const sres = await fetch(
            "http://127.0.0.1:8000/payroll/salary-structure",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                employee_id: data.employee_id,
                base_salary: base,
                house_allowance: Number(formData.houseAllowance) || 0,
                transport_allowance: Number(formData.transportAllowance) || 0,
                medical_allowance: Number(formData.medicalAllowance) || 0,
                other_allowances: Number(formData.otherAllowances) || 0,
                effective_from:
                  formData.joiningDate ||
                  new Date().toISOString().split("T")[0],
              }),
            },
          );
          salarySaved = sres.ok;
          if (!sres.ok) {
            const sdata = await sres.json().catch(() => ({}));
            setWarning(
              `${data.full_name} has been created, but the salary could not be saved (${sdata.detail || "unknown error"}). Set it from Payroll → Salaries.`,
            );
          }
        } catch {
          setWarning(
            `${data.full_name} has been created, but the salary could not be saved. Set it from Payroll → Salaries.`,
          );
        }
      }

      // Success — add to the list
      setCreatedUsers([
        {
          id: data.employee_id,
          name: data.full_name,
          email: data.email,
          department: formData.department,
          password: data.password,
          salary: salarySaved ? base : null,
        },
        ...createdUsers,
      ]);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Form reset
      setFormData({
        name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        joiningDate: "",
        password: "",
        baseSalary: "",
        houseAllowance: "",
        transportAllowance: "",
        medicalAllowance: "",
        otherAllowances: "",
      });
    } catch {
      setError("Unable to connect to the server.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-10 w-full px-4 md:px-0">
      <div className="p-6 md:p-8 rounded-2xl bg-black/40 backdrop-blur-md border border-[#05DC7F]/30 shadow-[0_0_25px_rgba(5,220,127,0.15)] w-full">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <FaUserPlus className="text-[#05DC7F]" />
          Create Employee Account
        </h2>

        {/* ──── Error ──── */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ──── Warning: employee created, salary not ──── */}
        {warning && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/15 border border-amber-500/60 text-amber-300 text-sm">
            {warning}
          </div>
        )}

        {/* ──── Success ──── */}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-[#05DC7F]/20 border border-[#05DC7F] text-[#05DC7F] text-sm">
            ✅ The employee has been created successfully!
          </div>
        )}

        <form
          onSubmit={handleCreateUser}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
        >
          {/* FULL NAME */}
          <div className="w-full">
            <label className="text-gray-400 text-sm">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-style"
              placeholder="Enter full name"
            />
          </div>

          {/* EMAIL */}
          <div className="w-full">
            <label className="text-gray-400 text-sm flex items-center gap-2">
              <FaEnvelope className="text-[#05DC7F]" /> Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-style"
              placeholder="Enter email"
            />
          </div>

          {/* PHONE */}
          <div className="w-full">
            <label className="text-gray-400 text-sm flex items-center gap-2">
              <FaPhone className="text-[#05DC7F]" /> Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input-style"
              placeholder="Enter phone number"
            />
          </div>

          {/* DEPARTMENT */}
          <div className="w-full">
            <label className="text-gray-400 text-sm flex items-center gap-2">
              <FaBuilding className="text-[#05DC7F]" /> Department
              <span className="text-white/30 text-xs">
                (where they sit — e.g. Engineering)
              </span>
            </label>
            <input
              type="text"
              name="department"
              list="known-departments"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Engineering"
              required
              className="input-style"
            />
            <datalist id="known-departments">
              {known.departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          {/* DESIGNATION — the role inside the department */}
          <div className="w-full">
            <label className="text-gray-400 text-sm flex items-center gap-2">
              <FaBuilding className="text-[#05DC7F]" /> Designation
              <span className="text-white/30 text-xs">
                (role within the department)
              </span>
            </label>
            <input
              type="text"
              name="designation"
              list="known-designations"
              value={formData.designation}
              onChange={handleChange}
              placeholder="e.g. Backend Developer"
              className="input-style"
            />
            <datalist id="known-designations">
              {known.designations.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          {/* JOINING DATE */}
          <div className="w-full">
            <label className="text-gray-400 text-sm">Joining Date</label>
            <input
              type="date"
              name="joiningDate"
              value={formData.joiningDate}
              onChange={handleChange}
              className="input-style"
            />
          </div>

          {/* ──── SALARY — set at hiring time ──── */}
          <div className="md:col-span-2 border-t border-gray-700 pt-6">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <FaMoneyBillWave className="text-[#05DC7F]" />
                Salary Structure
              </h3>
              <span className="text-xs text-gray-500">optional</span>
            </div>
            <p className="text-gray-500 text-xs mb-4">
              Set it now and this employee is included in payroll from the very
              first month. You can change it later from Payroll → Salaries.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="w-full">
                <label className="text-gray-400 text-sm">
                  Base Salary (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="baseSalary"
                  value={formData.baseSalary}
                  onChange={handleChange}
                  className="input-style"
                  placeholder="e.g. 100000"
                />
              </div>

              {[
                ["houseAllowance", "House Allowance"],
                ["transportAllowance", "Transport Allowance"],
                ["medicalAllowance", "Medical Allowance"],
                ["otherAllowances", "Other Allowances"],
              ].map(([key, label]) => (
                <div className="w-full" key={key}>
                  <label className="text-gray-400 text-sm">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    className="input-style"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            {/* The gross total — so the CEO sees it immediately */}
            {Number(formData.baseSalary) > 0 && (
              <div className="mt-4 text-sm text-gray-400">
                Monthly gross:{" "}
                <span className="text-[#05DC7F] font-semibold">
                  PKR{" "}
                  {(
                    Number(formData.baseSalary) +
                    (Number(formData.houseAllowance) || 0) +
                    (Number(formData.transportAllowance) || 0) +
                    (Number(formData.medicalAllowance) || 0) +
                    (Number(formData.otherAllowances) || 0)
                  ).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* PASSWORD */}
          <div className="md:col-span-2 flex flex-col gap-4 border-t border-gray-700 pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoPassword}
                  onChange={() => setAutoPassword(!autoPassword)}
                />
                <label className="text-gray-400 text-sm">
                  Auto Generate Password
                </label>
              </div>
              {autoPassword && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, password: generatePassword() })
                  }
                  className="ml-auto flex items-center gap-2 text-sm text-[#05DC7F]"
                >
                  <FaSync /> Regenerate
                </button>
              )}
            </div>
            {!autoPassword && (
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-style"
                placeholder="Enter password"
              />
            )}
          </div>

          {/* SUBMIT */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#05DC7F] text-black font-semibold hover:bg-[#04c56f] transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Employee"}
            </button>
          </div>
        </form>
      </div>

      {/* ──── Recently Created ──── */}
      {createdUsers.length > 0 && (
        <div className="flex flex-col gap-4 w-full">
          <h3 className="text-white text-xl md:text-2xl font-semibold">
            Recently Created Employees
          </h3>
          {createdUsers.map((user) => (
            <div
              key={user.id}
              className="p-5 rounded-xl bg-black/40 border border-[#05DC7F]/25 w-full"
            >
              <div className="flex flex-col md:flex-row justify-between flex-wrap gap-4">
                <div>
                  <p className="text-white font-semibold">{user.name}</p>
                  <p className="text-gray-400 text-sm">
                    {user.email} • {user.department}
                  </p>
                  <p className="text-gray-500 text-xs">ID: {user.id}</p>
                  {user.salary ? (
                    <p className="text-[#05DC7F] text-xs mt-1 flex items-center gap-1.5">
                      <FaMoneyBillWave />
                      Base PKR {user.salary.toLocaleString()} • payroll ready
                    </p>
                  ) : (
                    <p className="text-amber-400/80 text-xs mt-1">
                      Salary not set — add it from Payroll → Salaries
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <p className="text-gray-400 text-xs">Password:</p>
                  <p className="text-[#05DC7F] font-mono text-sm">
                    {user.password}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .input-style {
          width: 100%;
          margin-top: 6px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid #374151;
          color: white;
          outline: none;
          transition: all 0.3s ease;
        }
        .input-style:focus {
          border-color: #05dc7f;
          box-shadow: 0 0 12px rgba(5, 220, 127, 0.4);
        }
        select.input-style {
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg fill='%2305DC7F' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M5 7l5 5 5-5'/></svg>");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          cursor: pointer;
        }
        select.input-style option {
          background-color: #0f0f0f;
          color: white;
        }
      `}</style>
    </div>
  );
}
