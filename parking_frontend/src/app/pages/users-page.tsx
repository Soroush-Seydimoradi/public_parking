import { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { formatPersianDate } from "../lib/utils";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiFetch, apiGet } from "../lib/api";

interface DjangoUser {
  id: number;
  name: string;
  role: string;
  phone: string;
  last_login: string | null;
  is_active: boolean;
  avatar: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<DjangoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // فیلدهای فرم جدید
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("اپراتور");
  const [isActive, setIsActive] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchUsers = () => {
    apiGet<DjangoUser[]>("/api/users/")
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("خطا در دریافت لیست کاربران");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // تابع کمکی برای جلوگیری از کرش کردن سیستم در صورت خالی بودن یا خرابی فرمت تاریخ
  const safeFormatPersianDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "بدون ورود";
    try {
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        return "بدون ورود";
      }
      return formatPersianDate(dateStr);
    } catch (e) {
      return "بدون ورود";
    }
  };

  const handleSave = async () => {
    if (!name || !phone) {
      toast.error("لطفاً تمامی فیلدها را پر کنید");
      return;
    }
    setSubmitLoading(true);
    try {
      const response = await apiFetch("/api/users/", {
        method: "POST",
        body: JSON.stringify({ name, phone, role, is_active: isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "خطایی رخ داد");

      toast.success("کاربر جدید با موفقیت ذخیره شد");
      setIsDialogOpen(false);
      // ریست کردن فرم
      setName("");
      setPhone("");
      setRole("اپراتور");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "خطا در ذخیره کاربر");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("آیا از حذف این کاربر مطمئن هستید؟")) return;
    try {
      await apiDelete(`/api/users/${id}/`);
      toast.success("کاربر با موفقیت حذف شد");
      fetchUsers();
    } catch {
      toast.error("خطا در حذف کاربر");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>در حال دریافت لیست کاربران...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مدیریت کاربران</h1>
          <p className="text-muted-foreground">{users.length} کاربر در سیستم</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="ml-2 size-4" />
              افزودن کاربر
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>افزودن کاربر جدید</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">نام و نام خانوادگی</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام کاربر" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">شماره تماس (نام کاربری)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09121234567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">نقش</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مدیر">مدیر</SelectItem>
                    <SelectItem value="اپراتور">اپراتور</SelectItem>
                    <SelectItem value="کاربر">کاربر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="status">وضعیت فعال</Label>
                <Switch id="status" checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={submitLoading}>
                {submitLoading ? <Loader2 className="size-4 animate-spin" /> : "ذخیره"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">کاربر</TableHead>
              <TableHead className="text-right">نقش</TableHead>
              <TableHead className="text-right">شماره تماس</TableHead>
              <TableHead className="text-right">آخرین ورود</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{user.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.phone}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {safeFormatPersianDate(user.last_login)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.is_active ? "default" : "secondary"}
                    className={user.is_active ? "bg-success" : ""}
                  >
                    {user.is_active ? "فعال" : "غیرفعال"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}