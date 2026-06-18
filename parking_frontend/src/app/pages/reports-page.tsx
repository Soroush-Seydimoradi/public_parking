import { useCallback, useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { FileDown, Printer, FileText, Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { apiGet } from "../lib/api";
import { formatCurrency } from "../lib/utils";

interface RevenueTrendItem {
  date: string;
  amount: number;
}

interface VehicleTypeItem {
  name: string;
  value: number;
  color: string;
}

interface OccupancyItem {
  hour: string;
  rate: number;
}

interface ReportsResponse {
  revenue: {
    trend: RevenueTrendItem[];
    summary: {
      total_revenue: number;
      daily_average: number;
      peak_amount: number;
      peak_date: string | null;
    };
  };
  traffic: {
    vehicle_types: Array<{ name: string; value: number }>;
  };
  occupancy: {
    hourly_rates: OccupancyItem[];
  };
}

const VEHICLE_TYPE_COLORS: Record<string, string> = {
  "سواری": "#4f46e5",
  "وانت": "#10b981",
  "موتور": "#f59e0b",
  "کامیون": "#ef4444",
};

const DEFAULT_CHART_COLOR = "#94a3b8";

function formatReportDate(isoDate: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoDate));
}

function formatPeakLabel(isoDate: string | null): string {
  if (!isoDate) {
    return "—";
  }
  const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(new Date(isoDate));
  return weekday;
}

function withVehicleTypeColors(
  items: Array<{ name: string; value: number }>
): VehicleTypeItem[] {
  return items.map((item) => ({
    ...item,
    color: VEHICLE_TYPE_COLORS[item.name] ?? DEFAULT_CHART_COLOR,
  }));
}

export function ReportsPage() {
  const [dateRange, setDateRange] = useState("week");
  const [vehicleType, setVehicleType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueTrendItem[]>([]);
  const [revenueSummary, setRevenueSummary] = useState({
    total_revenue: 0,
    daily_average: 0,
    peak_amount: 0,
    peak_date: null as string | null,
  });
  const [vehicleTypeData, setVehicleTypeData] = useState<VehicleTypeItem[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyItem[]>([]);

  const fetchReports = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      range: dateRange,
      vehicle_type: vehicleType,
    });

    try {
      const data = await apiGet<ReportsResponse>(`/api/reports/?${params.toString()}`);

      setRevenueData(
        data.revenue.trend.map((item) => ({
          ...item,
          date: formatReportDate(item.date),
        }))
      );
      setRevenueSummary(data.revenue.summary);
      setVehicleTypeData(withVehicleTypeColors(data.traffic.vehicle_types));
      setOccupancyData(data.occupancy.hourly_rates);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "خطا در دریافت گزارش‌ها از سرور"
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange, vehicleType]);

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExport = (format: string) => {
    toast.success(`در حال خروجی ${format}...`);
  };

  const handleApplyFilters = () => {
    if (dateRange === "custom") {
      toast.error("برای بازه سفارشی، ابتدا تاریخ شروع و پایان را در نسخه بعدی سیستم تعریف کنید.");
      return;
    }
    fetchReports();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">گزارشات</h1>
          <p className="text-muted-foreground">تحلیل و گزارش‌های مالی و عملکردی</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport("PDF")}>
            <FileText className="ml-2 size-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport("Excel")}>
            <FileDown className="ml-2 size-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport("Print")}>
            <Printer className="ml-2 size-4" />
            چاپ
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>بازه زمانی</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">امروز</SelectItem>
                <SelectItem value="week">این هفته</SelectItem>
                <SelectItem value="month">این ماه</SelectItem>
                <SelectItem value="year">امسال</SelectItem>
                <SelectItem value="custom">سفارشی</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>نوع خودرو</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="سواری">سواری</SelectItem>
                <SelectItem value="وانت">وانت</SelectItem>
                <SelectItem value="موتور">موتور</SelectItem>
                <SelectItem value="کامیون">کامیون</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>اپراتور</Label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="op1">علی احمدی</SelectItem>
                <SelectItem value="op2">مریم رضایی</SelectItem>
                <SelectItem value="op3">حسین کریمی</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={handleApplyFilters} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 size-4 animate-spin" />
                  در حال بارگذاری...
                </>
              ) : (
                "اعمال فیلتر"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>در حال دریافت گزارش‌ها...</span>
        </div>
      ) : (
        /* Reports Tabs */
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="revenue">گزارش درآمد</TabsTrigger>
            <TabsTrigger value="traffic">گزارش تردد</TabsTrigger>
            <TabsTrigger value="occupancy">گزارش اشغال</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-6 space-y-6">
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">روند درآمد</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    name="درآمد (ریال)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">کل درآمد</p>
                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(revenueSummary.total_revenue)}
                </p>
                <p className="mt-1 text-sm text-success">↑ 12% نسبت به هفته قبل</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">میانگین روزانه</p>
                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(revenueSummary.daily_average)}
                </p>
                <p className="mt-1 text-sm text-success">↑ 8% نسبت به هفته قبل</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">بیشترین درآمد</p>
                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(revenueSummary.peak_amount)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatPeakLabel(revenueSummary.peak_date)}
                </p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="mt-6">
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">توزیع نوع خودرو</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={vehicleTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
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
          </TabsContent>

          <TabsContent value="occupancy" className="mt-6">
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">نرخ اشغال در طول روز</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={occupancyData}>
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
                  <Bar dataKey="rate" fill="#10b981" name="نرخ اشغال (%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
