import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { ParkingSquare } from "lucide-react";
import { motion } from "motion/react";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-success/10" dir="rtl">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -right-20 -top-20 size-96 rounded-full bg-primary/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 size-96 rounded-full bg-success/20 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="border-2 p-8 shadow-2xl backdrop-blur-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <motion.div
              className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <ParkingSquare className="size-10 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold">سیستم مدیریت پارکینگ</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              به پنل مدیریت خوش آمدید
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                type="text"
                placeholder="نام کاربری خود را وارد کنید"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                placeholder="رمز عبور خود را وارد کنید"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  مرا به خاطر بسپار
                </Label>
              </div>
              <Button variant="link" className="p-0 h-auto text-sm">
                فراموشی رمز عبور
              </Button>
            </div>

            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={isLoading}
            >
              {isLoading ? "در حال ورود..." : "ورود به سیستم"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              نسخه 1.0.0 | تمامی حقوق محفوظ است
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
