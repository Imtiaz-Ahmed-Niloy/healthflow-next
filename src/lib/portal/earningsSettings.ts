export interface FacilityCalculationSetting {
  tenant_id: string;
  facility_name: string;
  kind?: "chamber" | "hospital" | string;
  consultation_fee: number;
  doctor_share_percentage: number; // e.g. 80, 100, 70
  facility_deduction: number; // e.g. 0, 50, 100 tk
  override_global: boolean; // whether to use custom rate instead of global rules
}

export interface EarningsCalculationSettings {
  default_doctor_share_percentage: number; // default 80
  default_consultation_fee: number; // default 500
  facility_deduction: number; // default 0 tk per consultation
  tax_deduction_percentage: number; // default 0 % TDS
  facilities: Record<string, FacilityCalculationSetting>;
}

export const DEFAULT_EARNINGS_CALCULATION_SETTINGS: EarningsCalculationSettings = {
  default_doctor_share_percentage: 80,
  default_consultation_fee: 500,
  facility_deduction: 0,
  tax_deduction_percentage: 0,
  facilities: {},
};

export const EARNINGS_SETTINGS_STORAGE_KEY = "healthflow_portal_earnings_calc_settings";

export interface ConsultationSettlementResult {
  fee: number;
  share_percentage: number;
  gross_doctor_share: number;
  facility_deduction: number;
  tax_deduction: number;
  net_doctor_payout: number;
  hospital_cut: number;
  is_custom_rule: boolean;
}

/**
 * Calculates the exact settlement breakdown for a single consultation visit.
 */
export function calculateConsultationSettlement(
  baseFee: number | undefined | null,
  tenantId: string | null | undefined,
  settings: EarningsCalculationSettings,
): ConsultationSettlementResult {
  const facility = tenantId ? settings.facilities?.[tenantId] : undefined;
  const useOverride = Boolean(facility?.override_global);

  const appliedFee =
    useOverride && typeof facility?.consultation_fee === "number" && facility.consultation_fee >= 0
      ? facility.consultation_fee
      : baseFee && baseFee > 0
      ? baseFee
      : settings.default_consultation_fee || 500;

  const sharePercentage =
    useOverride && typeof facility?.doctor_share_percentage === "number"
      ? Math.max(0, Math.min(100, facility.doctor_share_percentage))
      : Math.max(0, Math.min(100, settings.default_doctor_share_percentage ?? 80));

  const facilityDeductionConfig =
    useOverride && typeof facility?.facility_deduction === "number"
      ? Math.max(0, facility.facility_deduction)
      : Math.max(0, settings.facility_deduction ?? 0);

  const taxPct = Math.max(0, Math.min(100, settings.tax_deduction_percentage ?? 0));

  const grossShare = Math.round((appliedFee * sharePercentage) / 100);
  const appliedFacilityDeduction = Math.min(grossShare, facilityDeductionConfig);
  const taxableBase = Math.max(0, grossShare - appliedFacilityDeduction);
  const taxDeduction = Math.round((taxableBase * taxPct) / 100);
  const netPayout = Math.max(0, taxableBase - taxDeduction);
  const hospitalCut = Math.max(0, appliedFee - netPayout);

  return {
    fee: appliedFee,
    share_percentage: sharePercentage,
    gross_doctor_share: grossShare,
    facility_deduction: appliedFacilityDeduction,
    tax_deduction: taxDeduction,
    net_doctor_payout: netPayout,
    hospital_cut: hospitalCut,
    is_custom_rule: useOverride,
  };
}
