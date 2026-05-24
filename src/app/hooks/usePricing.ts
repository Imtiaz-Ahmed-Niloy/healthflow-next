import { useEffect, useState } from "react";
import { loadPricing, PRICING_KEY, type PricingData } from "@/data/pricing";

export const usePricing = (): PricingData => {
  const [data, setData] = useState<PricingData>(() => loadPricing());

  useEffect(() => {
    const refresh = () => setData(loadPricing());
    const onStorage = (e: StorageEvent) => {
      if (e.key === `hf:${PRICING_KEY}`) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pricing:updated", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pricing:updated", refresh);
    };
  }, []);

  return data;
};
