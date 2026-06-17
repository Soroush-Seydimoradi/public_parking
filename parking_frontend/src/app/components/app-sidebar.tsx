import { Home, LogIn, LogOut, Car, DoorOpen, Users, CreditCard, Clock, BarChart3, Settings, ParkingSquare } from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

const navigation = [
  { name: "داشبورد", href: "/dashboard", icon: Home },
  { name: "ورود خودرو", href: "/vehicle-entry", icon: LogIn },
  { name: "خروج خودرو", href: "/vehicle-exit", icon: DoorOpen },
  { name: "خودروهای فعال", href: "/active-vehicles", icon: Car },
  { name: "جایگاه‌های پارکینگ", href: "/parking-spots", icon: ParkingSquare },
  { name: "مدیریت کاربران", href: "/users", icon: Users },
  { name: "مدیریت تعرفه", href: "/tariffs", icon: CreditCard },
  { name: "مدیریت شیفت", href: "/shifts", icon: Clock },
  { name: "گزارشات", href: "/reports", icon: BarChart3 },
  { name: "تنظیمات", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  isCollapsed?: boolean;
}

export function AppSidebar({ isCollapsed = false }: AppSidebarProps) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="p-6">
        <div className="flex items-center gap-3">
          {!isCollapsed && (
            <>
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ParkingSquare className="size-6" />
              </div>
              <div>
                <h2 className="font-semibold">پارکینگ هوشمند</h2>
                <p className="text-xs text-muted-foreground">سیستم مدیریت</p>
              </div>
            </>
          )}
          {isCollapsed && (
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ParkingSquare className="size-6" />
            </div>
          )}
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.name} to={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                  )}
                >
                  <item.icon className="size-5" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <div className={cn("rounded-lg bg-muted p-4", isCollapsed && "p-2")}>
          {!isCollapsed && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  ع ا
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm font-medium">علی احمدی</p>
                  <p className="text-xs text-muted-foreground">مدیر سیستم</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => window.location.href = "/"}>
                <LogOut className="size-4" />
                <span>خروج</span>
              </Button>
            </>
          )}
          {isCollapsed && (
            <Button variant="outline" size="icon" onClick={() => window.location.href = "/"}>
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
