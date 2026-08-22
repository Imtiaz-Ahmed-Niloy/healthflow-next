"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Kpi } from "@/components/admin/ui";
import { Users, Stethoscope, BedDouble, Calendar } from "lucide-react";

type DashboardData = {
  patients: { total: number };
  doctors: { active: number };
  beds: { available: number; total: number };
  appointments: { upcoming: number };
};

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/dashboard");
        const body = await res.json().catch(() => null);
        if (active && res.ok && body?.data) {
          setData(body.data);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminLayout title="Executive Dashboard" subtitle="Real-time hospital operations overview">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={Users}
          label="Total Patients"
          value={loading ? "—" : (data?.patients.total ?? 0).toLocaleString()}
        />
        <Kpi
          icon={Stethoscope}
          label="Active Doctors"
          value={loading ? "—" : (data?.doctors.active ?? 0).toLocaleString()}
          tone="accent"
        />
        <Kpi
          icon={BedDouble}
          label="Available Beds"
          value={
            loading
              ? "—"
              : `${data?.beds.available ?? 0} / ${data?.beds.total ?? 0}`
          }
          tone="chip"
        />
        <Kpi
          icon={Calendar}
          label="Upcoming Appointments"
          value={loading ? "—" : (data?.appointments.upcoming ?? 0).toLocaleString()}
        />
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
