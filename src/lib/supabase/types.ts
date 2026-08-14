export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      cms_pages: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_assistants: {
        Row: {
          created_at: string
          doctor_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          shift: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          shift?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          shift?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_assistants_doctor_fkey"
            columns: ["doctor_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "doctor_assistants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_assistants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_performance: {
        Row: {
          consultations: number
          created_at: string
          doctor_id: string
          feedback: number
          id: string
          patient_volume: number
          revenue: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          consultations?: number
          created_at?: string
          doctor_id: string
          feedback?: number
          id?: string
          patient_volume?: number
          revenue?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          consultations?: number
          created_at?: string
          doctor_id?: string
          feedback?: number
          id?: string
          patient_volume?: number
          revenue?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_performance_doctor_fkey"
            columns: ["doctor_id", "tenant_id"]
            isOneToOne: true
            referencedRelation: "doctors"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "doctor_performance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_shifts: {
        Row: {
          created_at: string
          day_of_week: string
          doctor_id: string
          end_time: string
          id: string
          shift_type: string
          start_time: string
          tenant_id: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: string
          doctor_id: string
          end_time: string
          id?: string
          shift_type?: string
          start_time: string
          tenant_id: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: string
          doctor_id?: string
          end_time?: string
          id?: string
          shift_type?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_shifts_doctor_fkey"
            columns: ["doctor_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "doctor_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          availability: string | null
          bio: string | null
          consultation_duration_minutes: number | null
          consultation_fee: number | null
          created_at: string
          education: string | null
          email: string | null
          experience_years: number | null
          expertise: string | null
          id: string
          languages: string | null
          name: string
          patients_treated: number | null
          phone: string | null
          photo_url: string | null
          profile_id: string | null
          rating: number | null
          slug: string
          specialty: string | null
          status: Database["public"]["Enums"]["doctor_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          consultation_duration_minutes?: number | null
          consultation_fee?: number | null
          created_at?: string
          education?: string | null
          email?: string | null
          experience_years?: number | null
          expertise?: string | null
          id?: string
          languages?: string | null
          name: string
          patients_treated?: number | null
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          rating?: number | null
          slug: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["doctor_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          availability?: string | null
          bio?: string | null
          consultation_duration_minutes?: number | null
          consultation_fee?: number | null
          created_at?: string
          education?: string | null
          email?: string | null
          experience_years?: number | null
          expertise?: string | null
          id?: string
          languages?: string | null
          name?: string
          patients_treated?: number | null
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          rating?: number | null
          slug?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["doctor_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_packages: {
        Row: {
          base_price: number
          billing_cycle: string
          created_at: string
          discount_pct: number
          id: string
          notes: string | null
          offer_id: string | null
          package_id: string
          renew_date: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          billing_cycle?: string
          created_at?: string
          discount_pct?: number
          id?: string
          notes?: string | null
          offer_id?: string | null
          package_id: string
          renew_date?: string | null
          start_date?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          billing_cycle?: string
          created_at?: string
          discount_pct?: number
          id?: string
          notes?: string | null
          offer_id?: string | null
          package_id?: string
          renew_date?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_packages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_pct: number
          id: string
          label: string
          package_id: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_pct?: number
          id?: string
          label?: string
          package_id?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_pct?: number
          id?: string
          label?: string
          package_id?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_users: number | null
          name: string
          price_monthly: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_users?: number | null
          name: string
          price_monthly?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_users?: number | null
          name?: string
          price_monthly?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          label: string
          pages: string[]
          permissions: Json
          role: Database["public"]["Enums"]["app_role"] | null
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          label: string
          pages?: string[]
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"] | null
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          label?: string
          pages?: string[]
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"] | null
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          about: string | null
          additional_emails: string[]
          additional_phones: string[]
          address: string | null
          awards: string | null
          beds: number | null
          bin: string | null
          board_notes: string | null
          ceo: string | null
          certifications: string | null
          chairman: string | null
          contact_email: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string
          district: string | null
          division: string | null
          doctor_count: number | null
          facilities: string | null
          founded_year: number | null
          id: string
          location: string | null
          logo_url: string | null
          management_body: Json
          medical_director: string | null
          name: string
          opening_hours: string | null
          operating_license: string | null
          other_licenses: string | null
          owner_address: string | null
          owner_email: string | null
          owner_name: string | null
          owner_nid: string | null
          owner_phone: string | null
          owner_since: string | null
          ownership_type: string | null
          package_id: string | null
          rating: number | null
          region: string | null
          reviews_count: number | null
          slug: string
          social: Json
          specialties: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          subdistrict: string | null
          summary: string | null
          tagline: string | null
          tin: string | null
          trade_license: string | null
          updated_at: string
          websites: string[]
        }
        Insert: {
          about?: string | null
          additional_emails?: string[]
          additional_phones?: string[]
          address?: string | null
          awards?: string | null
          beds?: number | null
          bin?: string | null
          board_notes?: string | null
          ceo?: string | null
          certifications?: string | null
          chairman?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          doctor_count?: number | null
          facilities?: string | null
          founded_year?: number | null
          id?: string
          location?: string | null
          logo_url?: string | null
          management_body?: Json
          medical_director?: string | null
          name: string
          opening_hours?: string | null
          operating_license?: string | null
          other_licenses?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_nid?: string | null
          owner_phone?: string | null
          owner_since?: string | null
          ownership_type?: string | null
          package_id?: string | null
          rating?: number | null
          region?: string | null
          reviews_count?: number | null
          slug: string
          social?: Json
          specialties?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subdistrict?: string | null
          summary?: string | null
          tagline?: string | null
          tin?: string | null
          trade_license?: string | null
          updated_at?: string
          websites?: string[]
        }
        Update: {
          about?: string | null
          additional_emails?: string[]
          additional_phones?: string[]
          address?: string | null
          awards?: string | null
          beds?: number | null
          bin?: string | null
          board_notes?: string | null
          ceo?: string | null
          certifications?: string | null
          chairman?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          doctor_count?: number | null
          facilities?: string | null
          founded_year?: number | null
          id?: string
          location?: string | null
          logo_url?: string | null
          management_body?: Json
          medical_director?: string | null
          name?: string
          opening_hours?: string | null
          operating_license?: string | null
          other_licenses?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_nid?: string | null
          owner_phone?: string | null
          owner_since?: string | null
          ownership_type?: string | null
          package_id?: string | null
          rating?: number | null
          region?: string | null
          reviews_count?: number | null
          slug?: string
          social?: Json
          specialties?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subdistrict?: string | null
          summary?: string | null
          tagline?: string | null
          tin?: string | null
          trade_license?: string | null
          updated_at?: string
          websites?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "tenants_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      hospitals_public: {
        Row: {
          about: string | null
          beds: number | null
          cover_image_url: string | null
          created_at: string | null
          district: string | null
          division: string | null
          doctor_count: number | null
          facilities: string | null
          founded_year: number | null
          id: string | null
          location: string | null
          logo_url: string | null
          name: string | null
          opening_hours: string | null
          rating: number | null
          reviews_count: number | null
          slug: string | null
          specialties: string | null
          subdistrict: string | null
          summary: string | null
          tagline: string | null
        }
        Insert: {
          about?: string | null
          beds?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          district?: string | null
          division?: string | null
          doctor_count?: number | null
          facilities?: string | null
          founded_year?: number | null
          id?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string | null
          opening_hours?: string | null
          rating?: number | null
          reviews_count?: number | null
          slug?: string | null
          specialties?: string | null
          subdistrict?: string | null
          summary?: string | null
          tagline?: string | null
        }
        Update: {
          about?: string | null
          beds?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          district?: string | null
          division?: string | null
          doctor_count?: number | null
          facilities?: string | null
          founded_year?: number | null
          id?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string | null
          opening_hours?: string | null
          rating?: number | null
          reviews_count?: number | null
          slug?: string | null
          specialties?: string | null
          subdistrict?: string | null
          summary?: string | null
          tagline?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_tenant_rls: { Args: { p_table: unknown }; Returns: undefined }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      auth_tenant_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "hospital_admin"
        | "hr_admin"
        | "finance_admin"
        | "lab_admin"
        | "pharmacy_admin"
        | "doctor"
        | "patient"
      doctor_status: "active" | "on_leave" | "suspended"
      tenant_status: "pending" | "approved" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "hospital_admin",
        "hr_admin",
        "finance_admin",
        "lab_admin",
        "pharmacy_admin",
        "doctor",
        "patient",
      ],
      doctor_status: ["active", "on_leave", "suspended"],
      tenant_status: ["pending", "approved", "suspended"],
    },
  },
} as const
