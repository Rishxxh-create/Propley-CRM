"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiMailLine,
  RiEyeLine,
  RiEyeOffLine,
  RiUser3Line,
  RiArrowRightUpLine,
  RiPhoneLine,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { PAGE } from "@/lib/copy";
import { PropleyLogo } from "@/components/PropleyLogo";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http-client";
import { setAuthSession } from "@/lib/auth-session";
import { toast } from "@/lib/toast";
import AuthLoading from "@/components/auth/AuthLoading";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser } from "@/store/slices/authSlice";

export default function AuthOverlay() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_EMAIL_LOGIN || "");
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(
    process.env.NEXT_PUBLIC_PASSWORD_LOGIN || "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: boolean) => {
    setIsLogin(next);
    setError(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!isLogin) {
        if (!name.trim()) throw new Error('Full name is required');
        const { registerRequest } = await import('@/lib/api/auth');
        await registerRequest({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        });
      }
      
      const res = await login({ email: email.trim(), password });
      setLoginSuccess(true);
      setAuthSession(res.token, res.user);
      dispatch(setAuthUser(res.user));
      router.replace("/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Authentication failed. Try again.";
      toast.error(message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loginSuccess) {
    return <AuthLoading label="Entering Sales Portal…" />;
  }

  const containerVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="flex h-dvh bg-stone overflow-hidden">
      {/* LEFT SIDE: AUTH FORM CONTAINER */}
      <div className="flex w-full flex-col p-8 lg:w-1/2 bg-white relative">
        {/* Signature Gold Accent */}
        <div className="absolute left-0 top-0 w-full h-[6px] bg-gold"></div>

        {/* Top Navigation */}
        <nav className="flex items-center justify-between shrink-0 mb-8">
          <PropleyLogo size="md" priority className="select-none" />
          <button
            onClick={() => switchMode(!isLogin)}
            className="group flex items-center text-xs font-medium text-zinc-500 hover:text-gold transition-all underline decoration-gold/20 underline-offset-4"
          >
            {isLogin ? PAGE.auth.becomeConsultant : PAGE.auth.backToLogin}
            {isLogin && (
              <RiArrowRightUpLine className="ml-1 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            )}
          </button>
        </nav>

        {/* Main Content Area - Flex-1 and Centered */}
        <div className="flex-1 flex flex-col justify-center mx-auto w-full max-w-[420px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login" : "register"}
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="mb-12">
                <h1 className="text-4xl font-semibold text-ink mb-3 leading-tight">
                  {isLogin ? PAGE.auth.loginTitle : PAGE.auth.registerTitle}
                </h1>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-[340px]">
                  {isLogin
                    ? PAGE.auth.loginDescription
                    : PAGE.auth.registerDescription}
                </p>
              </div>

              <form className="space-y-10" onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {!isLogin && (
                    <>
                      <div className="relative group">
                        <RiUser3Line className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300 z-10 text-lg transition-colors group-focus-within:text-gold" />
                        <Input
                          placeholder="Full Name"
                          className="h-12"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                          required
                        />
                      </div>
                      <div className="relative group">
                        <RiPhoneLine className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300 z-10 text-lg transition-colors group-focus-within:text-gold" />
                        <Input
                          type="tel"
                          placeholder="Phone (optional)"
                          className="h-12"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          autoComplete="tel"
                        />
                      </div>
                    </>
                  )}
                  <div className="relative group">
                    <RiMailLine className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300 z-10 text-lg transition-colors group-focus-within:text-gold" />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      className="h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="relative group">
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300 cursor-pointer hover:text-gold z-10"
                      onClick={() => setShowPassword(!showPassword)}
                      role="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <RiEyeOffLine size={18} />
                      ) : (
                        <RiEyeLine size={18} />
                      )}
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 group">
                      <Checkbox
                        id="remember"
                        className="data-checked:bg-gold data-checked:border-gold"
                      />
                      <label
                        htmlFor="remember"
                        className="text-xs font-medium text-zinc-500 cursor-pointer group-hover:text-gold transition-colors"
                      >
                        Keep me logged in
                      </label>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  loading={submitting}
                  className="w-full h-14 bg-ink text-white text-sm font-medium rounded-lg hover:bg-gold transition-all active:scale-[0.98] shadow-2xl disabled:opacity-60"
                >
                  {isLogin
                    ? "Enter Console"
                    : "Complete Registration"}
                </Button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Area */}
        <footer className="shrink-0 flex items-center justify-between border-t border-stone-alt pt-8 mt-8">
          <p className="text-xs font-medium text-zinc-400">
            © 2026 Propley Sales Engine
          </p>
          <div className="flex space-x-8">
            {["Guide", "Privacy", "Support"].map((item) => (
              <button
                key={item}
                className="text-xs font-medium text-zinc-400 hover:text-gold transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </footer>
      </div>

      {/* RIGHT SIDE: CINEMATIC VISUAL */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink relative overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"
        ></motion.div>
        <div className="absolute inset-0 bg-ink/10"></div>

        {/* Elegant Logo Mark */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="absolute bottom-12 right-12 text-white/5 font-semibold text-9xl select-none pointer-events-none transform rotate-[-90deg] translate-x-1/4"
        >
          Sales
        </motion.div>
      </div>
    </div>
  );
}
