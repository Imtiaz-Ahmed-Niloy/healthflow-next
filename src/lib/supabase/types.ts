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
      announcements: {
        Row: {
          body: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          tenant_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          tenant_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          tenant_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          changed_fields: string[]
          details: Json | null
          id: number
          occurred_at: string
          record_id: string | null
          table_name: string
          tenant_id: string | null
          tenant_name: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          changed_fields?: string[]
          details?: Json | null
          id?: never
          occurred_at?: string
          record_id?: string | null
          table_name: string
          tenant_id?: string | null
          tenant_name?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          changed_fields?: string[]
          details?: Json | null
          id?: never
          occurred_at?: string
          record_id?: string | null
          table_name?: string
          tenant_id?: string | null
          tenant_name?: string | null
        }
        Relationships: []
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
      certificates: {
        Row: {
          certificate_no: string
          created_at: string
          details: string | null
          employee_id: string | null
          id: string
          issued_by: string | null
          issued_on: string | null
          patient_id: string | null
          recipient_name: string
          status: Database["public"]["Enums"]["certificate_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["certificate_type"]
          updated_at: string
        }
        Insert: {
          certificate_no: string
          created_at?: string
          details?: string | null
          employee_id?: string | null
          id?: string
          issued_by?: string | null
          issued_on?: string | null
          patient_id?: string | null
          recipient_name: string
          status?: Database["public"]["Enums"]["certificate_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["certificate_type"]
          updated_at?: string
        }
        Update: {
          certificate_no?: string
          created_at?: string
          details?: string | null
          employee_id?: string | null
          id?: string
          issued_by?: string | null
          issued_on?: string | null
          patient_id?: string | null
          recipient_name?: string
          status?: Database["public"]["Enums"]["certificate_status"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["certificate_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_blog_posts: {
        Row: {
          author: string
          author_photo: string
          author_role: string
          body: string[]
          category: string
          cover: string
          created_at: string
          dek: string
          featured: boolean
          id: string
          published_at: string
          read_time: number
          slug: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author?: string
          author_photo?: string
          author_role?: string
          body?: string[]
          category?: string
          cover?: string
          created_at?: string
          dek?: string
          featured?: boolean
          id?: string
          published_at?: string
          read_time?: number
          slug: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author?: string
          author_photo?: string
          author_role?: string
          body?: string[]
          category?: string
          cover?: string
          created_at?: string
          dek?: string
          featured?: boolean
          id?: string
          published_at?: string
          read_time?: number
          slug?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          blocks: Json
          built_in: boolean
          created_at: string
          id: string
          path: string
          protected: boolean
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          built_in?: boolean
          created_at?: string
          id?: string
          path: string
          protected?: boolean
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          built_in?: boolean
          created_at?: string
          id?: string
          path?: string
          protected?: boolean
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
      employees: {
        Row: {
          blood_group: string | null
          created_at: string
          department: string | null
          designation: string | null
          documents_status: string
          email: string | null
          emp_id: string
          employment_type: string | null
          end_date: string | null
          father_name: string | null
          gross_salary: number | null
          id: string
          job_status: string
          marital_status: string | null
          mother_name: string | null
          name: string
          nid: string | null
          orientation_status: string
          permanent_address: string | null
          phone: string | null
          present_address: string | null
          religion: string | null
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          blood_group?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          documents_status?: string
          email?: string | null
          emp_id: string
          employment_type?: string | null
          end_date?: string | null
          father_name?: string | null
          gross_salary?: number | null
          id?: string
          job_status?: string
          marital_status?: string | null
          mother_name?: string | null
          name: string
          nid?: string | null
          orientation_status?: string
          permanent_address?: string | null
          phone?: string | null
          present_address?: string | null
          religion?: string | null
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          blood_group?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          documents_status?: string
          email?: string | null
          emp_id?: string
          employment_type?: string | null
          end_date?: string | null
          father_name?: string | null
          gross_salary?: number | null
          id?: string
          job_status?: string
          marital_status?: string | null
          mother_name?: string | null
          name?: string
          nid?: string | null
          orientation_status?: string
          permanent_address?: string | null
          phone?: string | null
          present_address?: string | null
          religion?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          kind: Database["public"]["Enums"]["finance_invoice_kind"]
          paid_at: string | null
          party: string
          patient_id: string | null
          reference: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          kind: Database["public"]["Enums"]["finance_invoice_kind"]
          paid_at?: string | null
          party: string
          patient_id?: string | null
          reference: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["finance_invoice_kind"]
          paid_at?: string | null
          party?: string
          patient_id?: string | null
          reference?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          created_at: string
          currency: string
          date_format: string
          id: string
          language: string
          maintenance_message: string | null
          maintenance_mode: boolean
          singleton: boolean
          support_email: string | null
          time_format: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          date_format?: string
          id?: string
          language?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          singleton?: boolean
          support_email?: string | null
          time_format?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          date_format?: string
          id?: string
          language?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          singleton?: boolean
          support_email?: string | null
          time_format?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          holiday_on: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          holiday_on: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          holiday_on?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_tenant_id_fkey"
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
      lab_orders: {
        Row: {
          created_at: string
          doctor_id: string | null
          id: string
          lab_test_id: string | null
          patient_id: string
          reference: string
          reported_at: string | null
          requested_at: string
          result: string | null
          status: Database["public"]["Enums"]["lab_order_status"]
          tenant_id: string
          test_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          id?: string
          lab_test_id?: string | null
          patient_id: string
          reference: string
          reported_at?: string | null
          requested_at?: string
          result?: string | null
          status?: Database["public"]["Enums"]["lab_order_status"]
          tenant_id: string
          test_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          id?: string
          lab_test_id?: string | null
          patient_id?: string
          reference?: string
          reported_at?: string | null
          requested_at?: string
          result?: string | null
          status?: Database["public"]["Enums"]["lab_order_status"]
          tenant_id?: string
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_lab_test_id_fkey"
            columns: ["lab_test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
      leave_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["leave_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["leave_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["leave_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
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
      patient_history: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          kind: Database["public"]["Enums"]["patient_history_kind"]
          label: string
          ongoing: boolean
          patient_id: string
          started_on: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          kind: Database["public"]["Enums"]["patient_history_kind"]
          label: string
          ongoing?: boolean
          patient_id: string
          started_on?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["patient_history_kind"]
          label?: string
          ongoing?: boolean
          patient_id?: string
          started_on?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          emergency_contact_relation: string | null
          full_name: string
          gender: Database["public"]["Enums"]["patient_gender"] | null
          height_feet: number | null
          height_inches: number | null
          id: string
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          mrn: string
          national_id: string | null
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
          emergency_contact_relation?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["patient_gender"] | null
          height_feet?: number | null
          height_inches?: number | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          mrn: string
          national_id?: string | null
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
          emergency_contact_relation?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["patient_gender"] | null
          height_feet?: number | null
          height_inches?: number | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          mrn?: string
          national_id?: string | null
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
      payroll_deduction_overrides: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          other: number | null
          tax: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          other?: number | null
          tax?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          other?: number | null
          tax?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_deduction_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_deduction_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_deduction_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payslips: {
        Row: {
          basic: number
          created_at: string
          department: string | null
          designation: string | null
          emp_id: string
          employee_id: string | null
          generated_at: string
          gross: number
          house_rent: number
          id: string
          loan: number
          medical: number
          name: string
          net: number
          period: string
          pf: number
          run_id: string
          tax: number
          tenant_id: string
          total_deductions: number
          transport: number
          updated_at: string
        }
        Insert: {
          basic?: number
          created_at?: string
          department?: string | null
          designation?: string | null
          emp_id: string
          employee_id?: string | null
          generated_at?: string
          gross?: number
          house_rent?: number
          id?: string
          loan?: number
          medical?: number
          name: string
          net?: number
          period: string
          pf?: number
          run_id: string
          tax?: number
          tenant_id: string
          total_deductions?: number
          transport?: number
          updated_at?: string
        }
        Update: {
          basic?: number
          created_at?: string
          department?: string | null
          designation?: string | null
          emp_id?: string
          employee_id?: string | null
          generated_at?: string
          gross?: number
          house_rent?: number
          id?: string
          loan?: number
          medical?: number
          name?: string
          net?: number
          period?: string
          pf?: number
          run_id?: string
          tax?: number
          tenant_id?: string
          total_deductions?: number
          transport?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payslips_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payslips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payslips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          department: string | null
          gross_total: number
          headcount: number
          id: string
          net_total: number
          period: string
          reference: string | null
          status: Database["public"]["Enums"]["payroll_run_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          gross_total?: number
          headcount?: number
          id?: string
          net_total?: number
          period: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payroll_run_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          gross_total?: number
          headcount?: number
          id?: string
          net_total?: number
          period?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payroll_run_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_settings: {
        Row: {
          basic_pct: number
          conveyance_pct: number
          created_at: string
          house_rent_pct: number
          id: string
          medical_pct: number
          pf_pct: number
          tax_pct: number
          tax_threshold: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          basic_pct?: number
          conveyance_pct?: number
          created_at?: string
          house_rent_pct?: number
          id?: string
          medical_pct?: number
          pf_pct?: number
          tax_pct?: number
          tax_threshold?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          basic_pct?: number
          conveyance_pct?: number
          created_at?: string
          house_rent_pct?: number
          id?: string
          medical_pct?: number
          pf_pct?: number
          tax_pct?: number
          tax_threshold?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_invoices: {
        Row: {
          billing_month: string
          created_at: string
          discount_pct: number
          due_date: string
          id: string
          issued_on: string
          notes: string | null
          package_id: string | null
          package_name: string
          paid_at: string | null
          prescriptions: number
          status: Database["public"]["Enums"]["platform_invoice_status"]
          tenant_id: string
          total: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          billing_month: string
          created_at?: string
          discount_pct?: number
          due_date: string
          id?: string
          issued_on?: string
          notes?: string | null
          package_id?: string | null
          package_name: string
          paid_at?: string | null
          prescriptions: number
          status?: Database["public"]["Enums"]["platform_invoice_status"]
          tenant_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          billing_month?: string
          created_at?: string
          discount_pct?: number
          due_date?: string
          id?: string
          issued_on?: string
          notes?: string | null
          package_id?: string | null
          package_name?: string
          paid_at?: string | null
          prescriptions?: number
          status?: Database["public"]["Enums"]["platform_invoice_status"]
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_invoices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_invoices_tenant_id_fkey"
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
      procurement_requisitions: {
        Row: {
          amount: number
          created_at: string
          department: string | null
          id: string
          notes: string | null
          reference: string
          requested_at: string
          stage: Database["public"]["Enums"]["requisition_stage"]
          tenant_id: string
          title: string
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          department?: string | null
          id?: string
          notes?: string | null
          reference: string
          requested_at?: string
          stage?: Database["public"]["Enums"]["requisition_stage"]
          tenant_id: string
          title: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          department?: string | null
          id?: string
          notes?: string | null
          reference?: string
          requested_at?: string
          stage?: Database["public"]["Enums"]["requisition_stage"]
          tenant_id?: string
          title?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_requisitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requisitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requisitions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      support_tickets: {
        Row: {
          assignee: string | null
          created_at: string
          details: string | null
          id: string
          priority: Database["public"]["Enums"]["support_ticket_priority"]
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          details?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          details?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
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
          opening_hours: Json | null
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
          opening_hours?: Json | null
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
          opening_hours?: Json | null
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
          opening_hours: Json | null
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
          opening_hours?: Json | null
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
          opening_hours?: Json | null
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
      attach_audit: {
        Args: { p_log_values?: boolean; p_table: unknown }
        Returns: undefined
      }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      auth_tenant_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      generate_platform_invoices: {
        Args: { p_month: string }
        Returns: {
          hospital: string
          invoice_id: string
          outcome: string
          prescriptions: number
          tenant_id: string
          total: number
        }[]
      }
      is_my_patient_record: { Args: { p_patient_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      record_medicine_usage: {
        Args: { p_doctor_id: string; p_medicines: Json; p_tenant_id: string }
        Returns: undefined
      }
      restore_staff_access: {
        Args: {
          p_profile_id: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_tenant_id: string
        }
        Returns: boolean
      }
      revoke_staff_access: { Args: { p_profile_id: string }; Returns: boolean }
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
      attendance_status: "present" | "late" | "absent" | "leave" | "half_day"
      audit_action: "insert" | "update" | "delete"
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
      certificate_status: "pending" | "issued" | "revoked"
      certificate_type:
        | "birth"
        | "death"
        | "medical_fitness"
        | "discharge"
        | "vaccination"
        | "disability"
        | "experience"
        | "noc"
        | "relieving"
        | "salary"
      doctor_status: "active" | "on_leave" | "suspended"
      finance_invoice_kind: "receivable" | "payable"
      lab_order_status:
        | "pending"
        | "sample_collected"
        | "processing"
        | "reported"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "sick" | "casual" | "vacation" | "maternity" | "unpaid"
      marital_status: "single" | "married" | "divorced" | "widowed"
      patient_gender: "male" | "female" | "other"
      patient_history_kind: "allergy" | "illness" | "medication" | "procedure"
      payroll_run_status: "draft" | "approved" | "paid"
      platform_invoice_status: "pending" | "paid" | "void"
      requisition_stage:
        | "pending"
        | "approved"
        | "ordered"
        | "delivered"
        | "rejected"
      support_ticket_priority: "low" | "medium" | "high" | "critical"
      support_ticket_status: "pending" | "processing" | "resolved"
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
      attendance_status: ["present", "late", "absent", "leave", "half_day"],
      audit_action: ["insert", "update", "delete"],
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
      certificate_status: ["pending", "issued", "revoked"],
      certificate_type: [
        "birth",
        "death",
        "medical_fitness",
        "discharge",
        "vaccination",
        "disability",
        "experience",
        "noc",
        "relieving",
        "salary",
      ],
      doctor_status: ["active", "on_leave", "suspended"],
      finance_invoice_kind: ["receivable", "payable"],
      lab_order_status: [
        "pending",
        "sample_collected",
        "processing",
        "reported",
      ],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["sick", "casual", "vacation", "maternity", "unpaid"],
      marital_status: ["single", "married", "divorced", "widowed"],
      patient_gender: ["male", "female", "other"],
      patient_history_kind: ["allergy", "illness", "medication", "procedure"],
      payroll_run_status: ["draft", "approved", "paid"],
      platform_invoice_status: ["pending", "paid", "void"],
      requisition_stage: [
        "pending",
        "approved",
        "ordered",
        "delivered",
        "rejected",
      ],
      support_ticket_priority: ["low", "medium", "high", "critical"],
      support_ticket_status: ["pending", "processing", "resolved"],
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
