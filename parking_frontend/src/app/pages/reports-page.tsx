import { useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { FileDown, Printer, FileText } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export function ReportsPage() {
  const [dateRange, setDateRange] = useState("week");

  const revenueData = [
    { date: "1402/06/01", amount: 1200000 },
    { date: "1402/06/02", amount: 1800000 },
    { date: "1402/06/03", amount: 2100000 },
    { date: "1402/06/04", amount: 1950000 },
    { date: "1402/06/05", amount: 2300000 },
    { date: "1402/06/06", amount: 2700000 },
    { date: "1402/06/07", amount: 2450000 },
  ];

  const vehicleTypeData = [
    { name: "سواری", value: 450, color: "#4f46e5" },
    { name: "وانت", value: 120, color: "#10b981" },
    { name: "موتور", value: 80, color: "#f59e0b" },
    { name: "کامیون", value: 30, color: "#ef4444" },
  ];

  const occupancyData = [
    { hour: "08:00", rate: 45 },
    { hour: "10:00", rate: 68 },
    { hour: "12:00", rate: 85 },
    { hour: "14:00", rate: 92 },
    { hour: "16:00", rate: 88 },
    { hour: "18:00", rate: 76 },
    { hour: "20:00", rate: 54 },
    { hour: "22:00", rate: 32 },
  ];

  const handleExport = (format: string) => {
    toast.success(`در حال خروجی ${format}...`);
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
            <Select defaultValue="all">
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
            <Button className="w-full">اعمال فیلتر</Button>
          </div>
        </div>
      </Card>

      {/* Reports Tabs */}
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
              <p className="mt-2 text-3xl font-bold">۱۴,۵۰۰,۰۰۰ ریال</p>
              <p className="mt-1 text-sm text-success">↑ 12% نسبت به هفته قبل</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">میانگین روزانه</p>
              <p className="mt-2 text-3xl font-bold">۲,۰۷۱,۴۲۸ ریال</p>
              <p className="mt-1 text-sm text-success">↑ 8% نسبت به هفته قبل</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">بیشترین درآمد</p>
              <p className="mt-2 text-3xl font-bold">۲,۷۰۰,۰۰۰ ریال</p>
              <p className="mt-1 text-sm text-muted-foreground">پنجشنبه</p>
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
    </div>
  );
}
