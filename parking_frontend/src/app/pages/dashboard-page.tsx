import { useEffect, useState } from "react";
import { StatCard } from "../components/stat-card";
import { Card } from "../components/ui/card";
import { Car, ParkingSquare, TrendingUp, Users, DollarSign, Activity, Loader2 } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { apiGet } from "../lib/api";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// اینترفیس ساختار داده زنده داشبورد از جنگو
interface DashboardStats {
  total_spots: number;
  vehicles_inside: number;
  available_spots: number;
  today_income: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ۱. دریافت اطلاعات زنده آماری از جنگو
  useEffect(() => {
    apiGet<DashboardStats>("/api/dashboard-stats/")
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading dashboard stats:", err);
        setLoading(false);
      });
  }, []);

  // مقادیر پیش‌فرض محاسباتی در صورت آماده نبودن دیتابیس
  const activeVehicles = stats ? stats.vehicles_inside : 0;
  const availableSpots = stats ? stats.available_spots : 0;
  const totalSpots = stats ? stats.total_spots : 40;
  const occupancyRate = totalSpots > 0 ? Math.round(((totalSpots - availableSpots) / totalSpots) * 100) : 0;
  const todayRevenue = stats ? Number(stats.today_income) : 0;

  // داده‌های نمودارها (داده‌های پایه/Mock پایا تا تکمیل بخش گزارشات جنگو)
  const revenueData = [
    { name: "شنبه", revenue: 1200000 },
    { name: "یکشنبه", revenue: 1800000 },
    { name: "دوشنبه", revenue: 2100000 },
    { name: "سه‌شنبه", revenue: 1950000 },
    { name: "چهارشنبه", revenue: 2300000 },
    { name: "پنجشنبه", revenue: 2700000 },
    { name: "جمعه", revenue: todayRevenue > 0 ? todayRevenue : 2450000 },
  ];

  const vehicleTypeData = [
    { name: "سواری", value: 65, color: "#4f46e5" },
    { name: "وانت", value: 20, color: "#10b981" },
    { name: "موتور", value: 10, color: "#f59e0b" },
    { name: "کامیون", value: 5, color: "#ef4444" },
  ];

  const trafficData = [
    { hour: "08:00", entries: 12, exits: 3 },
    { hour: "10:00", entries: 18, exits: 8 },
    { hour: "12:00", entries: 15, exits: 12 },
    { hour: "14:00", entries: 22, exits: 15 },
    { hour: "16:00", entries: 20, exits: 18 },
    { hour: "18:00", entries: activeVehicles, exits: 24 }, // متصل به ظرفیت فعلی پارکینگ
  ];

  const occupancyData = [
    { month: "فروردین", rate: 75 },
    { month: "اردیبهشت", rate: 82 },
    { month: "خرداد", rate: 78 },
    { month: "تیر", rate: 85 },
    { month: "مرداد", rate: 88 },
    { month: "شهریور", rate: occupancyRate > 0 ? occupancyRate : 90 },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>در حال به‌روزرسانی آمارهای زنده داشبورد...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">داشبورد</h1>
        <p className="text-muted-foreground">نمای کلی سیستم مدیریت پارکینگ (زنده و متصل به سرور)</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="خودروهای فعال (داخل)"
          value={activeVehicles}
          icon={Car}
          trend={{ value: "به‌روزرسانی لحظه‌ای", isPositive: true }}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="ظرفیت خالی"
          value={`${availableSpots}/${totalSpots}`}
          icon={ParkingSquare}
          trend={{ value: `${occupancyRate}% اشغال شده`, isPositive: false }}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title="درآمد امروز"
          value={formatCurrency(todayRevenue)}
          icon={DollarSign}
          trend={{ value: "بر اساس خروج‌های ثبت شده", isPositive: true }}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="ورود امروز"
          value={activeVehicles} // فرضی بر اساس ماشین‌های داخل
          icon={TrendingUp}
          iconClassName="bg-info/10 text-info"
        />
        <StatCard
          title="وضعیت کل"
          value={occupancyRate + "%"}
          icon={Activity}
          iconClassName="bg-destructive/10 text-destructive"
        />
        <StatCard
          title="اپراتورهای فعال"
          value="1"
          icon={Users}
          iconClassName="bg-chart-5/10 text-chart-5"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold">درآمد هفتگی</h3>
            <p className="text-sm text-muted-foreground">روند درآمد در هفته جاری</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Vehicle Type Distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold">توزیع نوع خودرو</h3>
            <p className="text-sm text-muted-foreground">درصد هر نوع خودرو در پارکینگ</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vehicleTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {vehicleTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Traffic Chart */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold">تردد خودروها</h3>
            <p className="text-sm text-muted-foreground">ورود و خروج در طول روز</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="hour" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="entries" fill="#10b981" name="ورود" radius={[8, 8, 0, 0]} />
              <Bar dataKey="exits" fill="#ef4444" name="خروج" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Occupancy Trend */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold">روند اشغال پارکینگ</h3>
            <p className="text-sm text-muted-foreground">درصد اشغال در 6 ماه گذشته</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: "#f59e0b", r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}