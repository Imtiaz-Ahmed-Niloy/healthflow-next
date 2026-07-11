"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldPlus, User, Stethoscope, BarChart3, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/site/AuthLayout";
import { authenticateTenant, startSession, provisionTenant } from "@/lib/tenants";
const vitamin = "/assets/product-vitamin.jpg";
const brain = "/assets/product-brain.jpg";
const sanitizer = "/assets/product-sanitizer.jpg";
const mist = "/assets/product-mist.jpg";

const sideAds = {
  left: [
    { tag: "SPONSORED", img: vitamin, t: "VitaBoost Pro™", d: "Advanced multivitamin complex for daily performance and immunity support.", tagColor: "bg-primary text-primary-foreground" },
    { tag: "NEW ARRIVAL", img: sanitizer, t: "EcoSanit™ Max", d: "Eco-friendly medical grade sanitization for healthcare professionals.", tagColor: "bg-primary text-primary-foreground" },
  ],
  right: [
    { tag: "LIMITED OFFER", img: brain, t: "NeuroPlus™", d: "Nootropic formulation for enhanced cognitive focus and mental clarity.", tagColor: "bg-destructive text-destructive-foreground" },
    { tag: "HEALTH TIP", img: mist, t: "SleepWell™ Mist", d: "Calming lavender and melatonin pillow spray for restorative sleep cycles.", tagColor: "bg-accent text-primary" },
  ],
};

const demos = [
  { icon: User, t: "Patient", e: "p-user@demo.pro", p: "patient123" },
  { icon: ShieldCheck, t: "Doctor", e: "dr-smith@demo.pro", p: "clinical456" },
  { icon: BarChart3, t: "Management", e: "mgmt@demo.pro", p: "flow789" },
  { icon: Stethoscope, t: "Super Admin", e: "root@demo.pro", p: "system000" },
];

const AdCard = ({ a }: { a: typeof sideAds.left[0] }) => (
  <motion.div whileHover={{ y: -4 }} className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-soft">
    <div className="relative">
      <img src={a.img} alt={a.t} loading="lazy" width={512} height={512} className="aspect-square w-full object-cover" />
      <span className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${a.tagColor}`}>{a.tag}</span>
    </div>
    <div className="p-5">
      <h4 className="font-semibold text-primary">{a.t}</h4>
      <p className="text-xs text-muted-foreground mt-2">{a.d}</p>
    </div>
  </motion.div>
);

const SignIn = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const routeFor = (mail: string) => {
    if (mail.startsWith("dr-")) return "/portal/queue";
    if (mail.startsWith("mgmt")) return "/admin/dashboard";
    if (mail.startsWith("root")) return "/super/dashboard";
    return "/patient/dashboard";
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tenant = authenticateTenant(email, password);
    if (tenant) {
      startSession(tenant);
      toast.success(`Welcome, ${tenant.hospital}`, { description: "Opening your admin portal..." });
      setTimeout(() => router.push("/admin/dashboard"), 500);
      return;
    }
    // Fallback: demo routing
    toast.success("Welcome back!", { description: "Redirecting to your portal..." });
    setTimeout(() => router.push(routeFor(email)), 600);
  };

  const fillDemo = (mail: string, p: string) => {
    setEmail(mail);
    setPassword(p);
    toast.success("Demo sign in", { description: "Redirecting..." });
    if (mail.startsWith("mgmt")) {
      const t = provisionTenant({ hospital: "Demo General Hospital", username: mail, password: p, contact: mail, plan: "Demo" });
      startSession(t);
    }
    setTimeout(() => router.push(routeFor(mail)), 500);
  };

  return (
    <AuthLayout>
      <div className="grid lg:grid-cols-[1fr_minmax(380px,520px)_1fr] gap-6 items-start">
        <div className="hidden lg:flex flex-col gap-6">{sideAds.left.map(a => <AdCard key={a.t} a={a} />)}</div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-3xl bg-card shadow-soft p-8 md:p-10">
          <div className="text-center">
            <img src="/favicon.png" alt="HealthFlow logo" className="mx-auto h-24 w-24 object-contain" />
            <h1 className="mt-3 font-display text-3xl text-primary">HealthFlow</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back!</p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="text-[11px] tracking-widest font-bold text-primary">EMAIL / USER ID</label>
              <input value={email} onChange={e => setEmail(e.target.value)} required type="text" placeholder="name@healthflow.pro or admin-riverside"
                className="mt-2 w-full bg-muted/60 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] tracking-widest font-bold text-primary">PASSWORD</label>
              <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="••••••••"
                className="mt-2 w-full bg-muted/60 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-foreground/70 cursor-pointer">
                <input type="checkbox" className="rounded border-border" /> Remember me
              </label>
              <Link href="/forgot-password" className="font-semibold text-primary-glow hover:underline">Forgot password?</Link>
            </div>
            <button className="w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-3.5 text-sm font-semibold hover:opacity-90 shadow-glow transition-opacity">Sign In</button>
            <p className="text-center text-xs text-muted-foreground">Don't have an account? <Link href="/signup" className="font-semibold text-primary-glow hover:underline">Create One</Link></p>
          </form>

          <div className="mt-10 pt-6 border-t border-border/60">
            <p className="text-center text-[10px] tracking-widest font-bold text-muted-foreground">DEMO ACCESS</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {demos.map(d => (
                <button key={d.t} type="button" onClick={() => fillDemo(d.e, d.p)}
                  className="text-left rounded-xl bg-muted/40 hover:bg-chip transition-colors p-3 border border-border/40">
                  <d.icon className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-primary mt-2">{d.t}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{d.e}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">pass: {d.p}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="hidden lg:flex flex-col gap-6">{sideAds.right.map(a => <AdCard key={a.t} a={a} />)}</div>
      </div>
    </AuthLayout>
  );
};
export default SignIn;

