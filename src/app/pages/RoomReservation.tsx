'use client';
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Hotel, Calendar, BedDouble, ArrowRight, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { hospitals } from "@/data/hospitals";

const allRooms = hospitals.flatMap((h) => h.rooms.map((r) => ({ ...r, hospital: h })));

const RoomReservation = () => {
  const params = useSearchParams();
  const initial = params.get("room");
  const initialHospital = params.get("hospital");
  const [selected, setSelected] = useState(
    () => allRooms.find((r) => r.type === initial && (!initialHospital || r.hospital.slug === initialHospital)) ?? allRooms[0],
  );
  const [nights, setNights] = useState(3);
  const [checkIn, setCheckIn] = useState("");

  const total = selected.price * nights;

  return (
    <div className="min-h-screen bg-gradient-hero"><main className="container mx-auto py-12">
        <Link href="/hospitals" className="inline-flex items-center gap-1.5 text-sm text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Hospitals
        </Link>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
          <Hotel className="h-3 w-3" /> Reservation
        </span>
        <h1 className="font-display text-5xl text-primary mt-3">Reserve a Room</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Choose your room category, dates and confirm. We'll prepare your space and send a check-in pass.</p>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-10">
          <div>
            <h2 className="font-display text-2xl text-primary mb-4">Available Rooms</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {allRooms.map((r, i) => {
                const active = selected.type === r.type && selected.hospital.slug === r.hospital.slug;
                return (
                  <motion.button key={`${r.hospital.slug}-${r.type}-${i}`} onClick={() => setSelected(r)} whileHover={{ y: -2 }}
                    className={`text-left rounded-2xl bg-card border-2 p-5 transition-all ${active ? "border-primary shadow-card" : "border-border/60 hover:border-primary/40"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-primary-glow">{r.category}</span>
                        <p className="font-display text-lg text-primary mt-1 leading-tight">{r.type}</p>
                        <p className="text-xs text-muted-foreground">{r.hospital.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-xl text-primary">${r.price}</p>
                        <p className="text-[10px] text-muted-foreground">/ night</p>
                      </div>
                    </div>
                    <div className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1.5"><BedDouble className="h-3 w-3" />{r.capacity} · {r.size}</div>
                    <p className="text-xs text-foreground/70 mt-2 line-clamp-2">{r.amenities}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className={r.available === 0 ? "text-destructive" : "text-primary"}>{r.available} of {r.total} available</span>
                      {active && <span className="inline-flex items-center gap-1 text-primary font-semibold"><CheckCircle2 className="h-3 w-3" />Selected</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-3xl bg-card border border-border/60 shadow-card p-6 sticky top-24 self-start">
            <h2 className="font-display text-xl text-primary">Booking Summary</h2>
            <div className="mt-4 space-y-1">
              <p className="font-display text-2xl text-primary">{selected.type}</p>
              <p className="text-sm text-muted-foreground">{selected.hospital.name} · {selected.hospital.location}</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (selected.available === 0) return toast.error("Room is full"); toast.success("Reservation confirmed", { description: `${selected.type} · ${nights} nights · $${total}` }); }}
              className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Check-in date</label>
                <Input required type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-2 rounded-xl" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Nights</label>
                <Input required type="number" min={1} max={60} value={nights} onChange={(e) => setNights(Math.max(1, Number(e.target.value)))} className="mt-2 rounded-xl" />
              </div>

              <div className="rounded-2xl bg-accent/20 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-foreground/70"><span>Rate</span><span>${selected.price} × {nights}</span></div>
                <div className="flex justify-between text-foreground/70"><span>Service fee</span><span>$0</span></div>
                <div className="flex justify-between font-display text-primary text-lg pt-2 border-t border-border/40"><span>Total</span><span>${total}</span></div>
              </div>

              <button className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow inline-flex items-center justify-center gap-2">
                Confirm Reservation <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Free cancellation up to 48h before check-in</p>
            </form>
          </aside>
        </div>
      </main></div>
  );
};

export default RoomReservation;
