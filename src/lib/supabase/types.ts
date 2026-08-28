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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admissions: {
        Row: {
          admitted_at: string
          created_at: string
          diagnosis: string | null
          discharged_at: string | null
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["admission_priority"]
          status: Database["public"]["Enums"]["admission_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admitted_at?: string
          created_at?: string
          diagnosis?: string | null
          discharged_at?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["admission_priority"]
          status?: Database["public"]["Enums"]["admission_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admitted_at?: string
          created_at?: string
          diagnosis?: string | null
          discharged_at?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["admission_priority"]
          status?: Database["public"]["Enums"]["admission_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admissions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          advice: Json
          bp_diastolic: number | null
          bp_systolic: number | null
          complaints: Json
          consultation_started_at: string | null
          created_at: string
          department: string | null
          diagnosis: Json
          doctor_id: string | null
          examination: Json
          id: string
          investigation: Json
          medicines: Json
          notes: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["appointment_priority"]
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          advice?: Json
          bp_diastolic?: number | null
          bp_systolic?: number | null
          complaints?: Json
          consultation_started_at?: string | null
          created_at?: string
          department?: string | null
          diagnosis?: Json
          doctor_id?: string | null
          examination?: Json
          id?: string
          investigation?: Json
          medicines?: Json
          notes?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["appointment_priority"]
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          advice?: Json
          bp_diastolic?: number | null
          bp_systolic?: number | null
          complaints?: Json
          consultation_started_at?: string | null
          created_at?: string
          department?: string | null
          diagnosis?: Json
          doctor_id?: string | null
          examination?: Json
          id?: string
          investigation?: Json
          medicines?: Json
          notes?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["appointment_priority"]
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          assignee: string | null
          category: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          purchased_at: string | null
          status: string
          tag: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchased_at?: string | null
          status?: string
          tag: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchased_at?: string | null
          status?: string
          tag?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bed_stays: {
        Row: {
          admission_id: string
          bed_id: string | null
          cabin_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admission_id: string
          bed_id?: string | null
          cabin_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admission_id?: string
          bed_id?: string | null
          cabin_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bed_stays_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_stays_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_stays_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_stays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_stays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          created_at: string
          id: string
          number: string
          patient: string | null
          status: Database["public"]["Enums"]["bed_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["bed_type"]
          updated_at: string
          ward_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          number: string
          patient?: string | null
          status?: Database["public"]["Enums"]["bed_status"]
          tenant_id: string
          type?: Database["public"]["Enums"]["bed_type"]
          updated_at?: string
          ward_id: string
        }
        Update: {
          created_at?: string
          id?: string
          number?: string
          patient?: string | null
          status?: Database["public"]["Enums"]["bed_status"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["bed_type"]
          updated_at?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      cabins: {
        Row: {
          admitted_on: string | null
          amenities: string[]
          attendant: string | null
          capacity: number
          category: Database["public"]["Enums"]["cabin_category"]
          created_at: string
          daily_rate: number
          floor: string
          id: string
          number: string
          patient: string | null
          status: Database["public"]["Enums"]["cabin_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admitted_on?: string | null
          amenities?: string[]
          attendant?: string | null
          capacity?: number
          category?: Database["public"]["Enums"]["cabin_category"]
          created_at?: string
          daily_rate?: number
          floor: string
          id?: string
          number: string
          patient?: string | null
          status?: Database["public"]["Enums"]["cabin_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admitted_on?: string | null
          amenities?: string[]
          attendant?: string | null
          capacity?: number
          category?: Database["public"]["Enums"]["cabin_category"]
          created_at?: string
          daily_rate?: number
          floor?: string
          id?: string
          number?: string
          patient?: string | null
          status?: Database["public"]["Enums"]["cabin_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cabins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cabins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
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
            foreignKeyName: "doctor_assistants_doctor_fkey"
            columns: ["doctor_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
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
      doctor_login_secrets: {
        Row: {
          created_at: string
          doctor_id: string
          password_enc: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          password_enc: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          password_enc?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_login_secrets_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_login_secrets_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_login_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_login_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_medicine_usage: {
        Row: {
          created_at: string
          doctor_id: string
          dosage_form: string
          dose: string
          id: string
          last_used_at: string
          name: string
          tenant_id: string
          use_count: number
        }
        Insert: {
          created_at?: string
          doctor_id: string
          dosage_form?: string
          dose?: string
          id?: string
          last_used_at?: string
          name: string
          tenant_id: string
          use_count?: number
        }
        Update: {
          created_at?: string
          doctor_id?: string
          dosage_form?: string
          dose?: string
          id?: string
          last_used_at?: string
          name?: string
          tenant_id?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_medicine_usage_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_medicine_usage_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_medicine_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_medicine_usage_tenant_id_fkey"
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
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "doctor_performance_doctor_fkey"
            columns: ["doctor_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "doctor_performance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
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
            foreignKeyName: "doctor_shifts_doctor_fkey"
            columns: ["doctor_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "doctor_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
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
          gender: Database["public"]["Enums"]["patient_gender"] | null
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
          gender?: Database["public"]["Enums"]["patient_gender"] | null
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
          gender?: Database["public"]["Enums"]["patient_gender"] | null
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
      hospital_admin_secrets: {
        Row: {
          created_at: string
          email: string
          password_enc: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          password_enc: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          password_enc?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_admin_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_admin_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      lab_tests: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          prep: string | null
          price: number
          sample: string | null
          status: string
          tenant_id: string
          turnaround: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          prep?: string | null
          price: number
          sample?: string | null
          status?: string
          tenant_id: string
          turnaround?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          prep?: string | null
          price?: number
          sample?: string | null
          status?: string
          tenant_id?: string
          turnaround?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_tests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nurse_performance: {
        Row: {
          attendance_pct: number
          created_at: string
          feedback: number
          hours_worked: number
          id: string
          incidents: number
          nurse_id: string
          patients_handled: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attendance_pct?: number
          created_at?: string
          feedback?: number
          hours_worked?: number
          id?: string
          incidents?: number
          nurse_id: string
          patients_handled?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attendance_pct?: number
          created_at?: string
          feedback?: number
          hours_worked?: number
          id?: string
          incidents?: number
          nurse_id?: string
          patients_handled?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurse_performance_nurse_fkey"
            columns: ["nurse_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "nurse_performance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurse_performance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nurse_shifts: {
        Row: {
          created_at: string
          day_of_week: string
          id: string
          nurse_id: string
          shift_type: string
          tenant_id: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: string
          id?: string
          nurse_id: string
          shift_type?: string
          tenant_id: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: string
          id?: string
          nurse_id?: string
          shift_type?: string
          tenant_id?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nurse_shifts_nurse_fkey"
            columns: ["nurse_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "nurse_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurse_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nurses: {
        Row: {
          created_at: string
          email: string | null
          experience_years: number | null
          id: string
          license: string | null
          name: string
          phone: string | null
          qualification: string | null
          shift: string
          status: string
          tenant_id: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          experience_years?: number | null
          id?: string
          license?: string | null
          name: string
          phone?: string | null
          qualification?: string | null
          shift?: string
          status?: string
          tenant_id: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          experience_years?: number | null
          id?: string
          license?: string | null
          name?: string
          phone?: string | null
          qualification?: string | null
          shift?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nurses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
      patients: {
        Row: {
          address: string | null
          blood_group: Database["public"]["Enums"]["blood_group"] | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: Database["public"]["Enums"]["patient_gender"] | null
          height_feet: number | null
          height_inches: number | null
          id: string
          mrn: string
          phone: string | null
          profile_id: string | null
          tenant_id: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          address?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["patient_gender"] | null
          height_feet?: number | null
          height_inches?: number | null
          id?: string
          mrn: string
          phone?: string | null
          profile_id?: string | null
          tenant_id: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          address?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["patient_gender"] | null
          height_feet?: number | null
          height_inches?: number | null
          id?: string
          mrn?: string
          phone?: string | null
          profile_id?: string | null
          tenant_id?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          reorder: number
          sku: string
          status: string
          stock: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          reorder?: number
          sku: string
          status?: string
          stock?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          reorder?: number
          sku?: string
          status?: string
          stock?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      support_staff: {
        Row: {
          created_at: string
          department: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          category: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          category: Database["public"]["Enums"]["ward_category"]
          created_at: string
          daily_rate: number
          facilities: string[]
          id: string
          name: string
          notes: string | null
          nursing_charge: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["ward_category"]
          created_at?: string
          daily_rate?: number
          facilities?: string[]
          id?: string
          name: string
          notes?: string | null
          nursing_charge?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ward_category"]
          created_at?: string
          daily_rate?: number
          facilities?: string[]
          id?: string
          name?: string
          notes?: string | null
          nursing_charge?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      doctors_public: {
        Row: {
          availability: string | null
          bio: string | null
          consultation_duration_minutes: number | null
          consultation_fee: number | null
          created_at: string | null
          district: string | null
          division: string | null
          education: string | null
          experience_years: number | null
          expertise: string | null
          gender: Database["public"]["Enums"]["patient_gender"] | null
          hospital_name: string | null
          hospital_slug: string | null
          id: string | null
          languages: string | null
          location: string | null
          name: string | null
          patients_treated: number | null
          photo_url: string | null
          rating: number | null
          slug: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["doctor_status"] | null
          subdistrict: string | null
          tenant_id: string | null
        }
        Relationships: [
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
      hospitals_public: {
        Row: {
          about: string | null
          additional_emails: string[] | null
          additional_phones: string[] | null
          address: string | null
          beds: number | null
          contact_email: string | null
          contact_phone: string | null
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
          social: Json | null
          specialties: string | null
          subdistrict: string | null
          summary: string | null
          tagline: string | null
          websites: string[] | null
        }
        Insert: {
          about?: string | null
          additional_emails?: string[] | null
          additional_phones?: string[] | null
          address?: string | null
          beds?: number | null
          contact_email?: string | null
          contact_phone?: string | null
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
          social?: Json | null
          specialties?: string | null
          subdistrict?: string | null
          summary?: string | null
          tagline?: string | null
          websites?: string[] | null
        }
        Update: {
          about?: string | null
          additional_emails?: string[] | null
          additional_phones?: string[] | null
          address?: string | null
          beds?: number | null
          contact_email?: string | null
          contact_phone?: string | null
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
          social?: Json | null
          specialties?: string | null
          subdistrict?: string | null
          summary?: string | null
          tagline?: string | null
          websites?: string[] | null
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
      record_medicine_usage: {
        Args: { p_doctor_id: string; p_medicines: Json; p_tenant_id: string }
        Returns: undefined
      }
      transfer_admission: {
        Args: { p_admission_id: string; p_bed_id?: string; p_cabin_id?: string }
        Returns: {
          admission_id: string
          bed_id: string | null
          cabin_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bed_stays"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      admission_priority: "routine" | "urgent" | "critical"
      admission_status:
        | "admitted"
        | "under_observation"
        | "in_surgery"
        | "discharged"
      app_role:
        | "super_admin"
        | "hospital_admin"
        | "hr_admin"
        | "finance_admin"
        | "lab_admin"
        | "pharmacy_admin"
        | "doctor"
        | "patient"
      appointment_priority: "high" | "standard" | "routine"
      appointment_status: "scheduled" | "completed" | "cancelled"
      bed_status: "available" | "occupied" | "cleaning"
      bed_type: "general" | "icu" | "cabin"
      blood_group:
        | "o_positive"
        | "o_negative"
        | "a_positive"
        | "a_negative"
        | "b_positive"
        | "b_negative"
        | "ab_positive"
        | "ab_negative"
      cabin_category: "standard" | "deluxe" | "premium" | "suite"
      cabin_status:
        | "available"
        | "occupied"
        | "cleaning"
        | "maintenance"
        | "reserved"
      doctor_status: "active" | "on_leave" | "suspended"
      patient_gender: "male" | "female" | "other"
      tenant_status: "pending" | "approved" | "suspended"
      ward_category:
        | "general"
        | "semi_private"
        | "icu"
        | "maternity"
        | "pediatric"
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
      admission_priority: ["routine", "urgent", "critical"],
      admission_status: [
        "admitted",
        "under_observation",
        "in_surgery",
        "discharged",
      ],
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
      appointment_priority: ["high", "standard", "routine"],
      appointment_status: ["scheduled", "completed", "cancelled"],
      bed_status: ["available", "occupied", "cleaning"],
      bed_type: ["general", "icu", "cabin"],
      blood_group: [
        "o_positive",
        "o_negative",
        "a_positive",
        "a_negative",
        "b_positive",
        "b_negative",
        "ab_positive",
        "ab_negative",
      ],
      cabin_category: ["standard", "deluxe", "premium", "suite"],
      cabin_status: [
        "available",
        "occupied",
        "cleaning",
        "maintenance",
        "reserved",
      ],
      doctor_status: ["active", "on_leave", "suspended"],
      patient_gender: ["male", "female", "other"],
      tenant_status: ["pending", "approved", "suspended"],
      ward_category: [
        "general",
        "semi_private",
        "icu",
        "maternity",
        "pediatric",
      ],
    },
  },
} as const
