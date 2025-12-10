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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      buyer_reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          seller_id: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          seller_id: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          message: string | null
          order_id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_typing_status: {
        Row: {
          id: string
          is_typing: boolean
          order_id: string
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          id?: string
          is_typing?: boolean
          order_id: string
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          id?: string
          is_typing?: boolean
          order_id?: string
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_percentage: number
          id: string
          is_active: boolean
          times_used: number
          updated_at: string
          usage_limit: number | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_percentage: number
          id?: string
          is_active?: boolean
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
          valid_until?: string | null
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          admin_notes: string | null
          alert_type: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string
          severity: string
        }
        Insert: {
          admin_notes?: string | null
          alert_type: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id: string
          severity?: string
        }
        Update: {
          admin_notes?: string | null
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_chat_status: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          last_message_at: string | null
          order_id: string
          unread_admin_count: number
          unread_customer_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          order_id: string
          unread_admin_count?: number
          unread_customer_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          order_id?: string
          unread_admin_count?: number
          unread_customer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_chat_status_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          discount_amount: number | null
          id: string
          payment_id: string | null
          payment_method: string
          payment_status: string
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          product_id: string
          product_name: string
          product_price: number
          seller_id: string | null
          seller_name: string | null
          ticket_url: string | null
          transaction_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          payment_id?: string | null
          payment_method: string
          payment_status?: string
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          product_id: string
          product_name: string
          product_price: number
          seller_id?: string | null
          seller_name?: string | null
          ticket_url?: string | null
          transaction_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          payment_id?: string | null
          payment_method?: string
          payment_status?: string
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          product_id?: string
          product_name?: string
          product_price?: number
          seller_id?: string | null
          seller_name?: string | null
          ticket_url?: string | null
          transaction_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          product_id: string
          reason: string
          report_type: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          product_id: string
          reason: string
          report_type?: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          product_id?: string
          reason?: string
          report_type?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reports_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          order_id: string
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          order_id: string
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          order_id?: string
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          buyer_rating: number | null
          created_at: string
          full_name: string
          id: string
          total_purchases: number | null
          total_ratings_received: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          buyer_rating?: number | null
          created_at?: string
          full_name: string
          id: string
          total_purchases?: number | null
          total_ratings_received?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          buyer_rating?: number | null
          created_at?: string
          full_name?: string
          id?: string
          total_purchases?: number | null
          total_ratings_received?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      refund_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          refund_id: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          refund_id?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          refund_id?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_logs_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          message: string | null
          refund_id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          refund_id: string
          sender_id: string
          sender_type: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          refund_id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_messages_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_decision: string | null
          admin_notes: string | null
          created_at: string
          customer_id: string
          customer_pix_key: string
          description: string | null
          id: string
          order_amount: number
          order_id: string
          pix_key_type: string
          proofs: string[] | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          seller_deducted_amount: number | null
          seller_id: string | null
          seller_responded_at: string | null
          seller_response: string | null
          status: string
        }
        Insert: {
          admin_decision?: string | null
          admin_notes?: string | null
          created_at?: string
          customer_id: string
          customer_pix_key: string
          description?: string | null
          id?: string
          order_amount: number
          order_id: string
          pix_key_type: string
          proofs?: string[] | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          seller_deducted_amount?: number | null
          seller_id?: string | null
          seller_responded_at?: string | null
          seller_response?: string | null
          status?: string
        }
        Update: {
          admin_decision?: string | null
          admin_notes?: string | null
          created_at?: string
          customer_id?: string
          customer_pix_key?: string
          description?: string | null
          id?: string
          order_amount?: number
          order_id?: string
          pix_key_type?: string
          proofs?: string[] | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          seller_deducted_amount?: number | null
          seller_id?: string | null
          seller_responded_at?: string | null
          seller_response?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_followers: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          seller_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          seller_id?: string
        }
        Relationships: []
      }
      seller_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          product_id: string | null
          seller_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          product_id?: string | null
          seller_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          product_id?: string | null
          seller_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_notifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_product_keys: {
        Row: {
          created_at: string
          id: string
          is_used: boolean
          key_content: string
          order_id: string | null
          product_id: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_used?: boolean
          key_content: string
          order_id?: string | null
          product_id: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_used?: boolean
          key_content?: string
          order_id?: string | null
          product_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_product_keys_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_product_keys_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_products: {
        Row: {
          category: string | null
          created_at: string
          delivery_content: string | null
          delivery_method: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          likes_count: number
          meta_description: string | null
          name: string
          price: number
          search_vector: unknown
          seller_id: string
          slug: string | null
          stock: number
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          delivery_content?: string | null
          delivery_method?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          likes_count?: number
          meta_description?: string | null
          name: string
          price: number
          search_vector?: unknown
          seller_id: string
          slug?: string | null
          stock?: number
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          delivery_content?: string | null
          delivery_method?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          likes_count?: number
          meta_description?: string | null
          name?: string
          price?: number
          search_vector?: unknown
          seller_id?: string
          slug?: string | null
          stock?: number
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          available_balance: number
          average_rating: number
          banner_url: string | null
          bio: string | null
          birth_date: string
          cpf: string
          cpf_change_count: number
          created_at: string
          fraud_risk_level: string | null
          full_name: string
          id: string
          is_approved: boolean
          is_suspended: boolean
          last_profile_change: string | null
          last_refund_reset: string | null
          monthly_refunds_count: number | null
          original_cpf: string | null
          pending_balance: number
          pix_key: string
          reports_count: number | null
          total_sales: number
          updated_at: string
          user_id: string
          warning_count: number
        }
        Insert: {
          available_balance?: number
          average_rating?: number
          banner_url?: string | null
          bio?: string | null
          birth_date: string
          cpf: string
          cpf_change_count?: number
          created_at?: string
          fraud_risk_level?: string | null
          full_name: string
          id?: string
          is_approved?: boolean
          is_suspended?: boolean
          last_profile_change?: string | null
          last_refund_reset?: string | null
          monthly_refunds_count?: number | null
          original_cpf?: string | null
          pending_balance?: number
          pix_key: string
          reports_count?: number | null
          total_sales?: number
          updated_at?: string
          user_id: string
          warning_count?: number
        }
        Update: {
          available_balance?: number
          average_rating?: number
          banner_url?: string | null
          bio?: string | null
          birth_date?: string
          cpf?: string
          cpf_change_count?: number
          created_at?: string
          fraud_risk_level?: string | null
          full_name?: string
          id?: string
          is_approved?: boolean
          is_suspended?: boolean
          last_profile_change?: string | null
          last_refund_reset?: string | null
          monthly_refunds_count?: number | null
          original_cpf?: string | null
          pending_balance?: number
          pix_key?: string
          reports_count?: number | null
          total_sales?: number
          updated_at?: string
          user_id?: string
          warning_count?: number
        }
        Relationships: []
      }
      seller_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          order_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reports_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_sales: {
        Row: {
          balance_released_at: string | null
          buyer_email: string
          buyer_id: string | null
          buyer_name: string
          created_at: string
          fee_amount: number
          id: string
          net_amount: number
          product_id: string
          product_name: string
          sale_amount: number
          seller_id: string
          status: string
        }
        Insert: {
          balance_released_at?: string | null
          buyer_email: string
          buyer_id?: string | null
          buyer_name: string
          created_at?: string
          fee_amount: number
          id?: string
          net_amount: number
          product_id: string
          product_name: string
          sale_amount: number
          seller_id: string
          status?: string
        }
        Update: {
          balance_released_at?: string | null
          buyer_email?: string
          buyer_id?: string | null
          buyer_name?: string
          created_at?: string
          fee_amount?: number
          id?: string
          net_amount?: number
          product_id?: string
          product_name?: string
          sale_amount?: number
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_warnings: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          order_id: string | null
          reason: string
          seller_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          reason: string
          seller_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_warnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_warnings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_withdrawals: {
        Row: {
          amount: number
          id: string
          pix_key: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          seller_id: string
          status: string
        }
        Insert: {
          amount: number
          id?: string
          pix_key: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          seller_id: string
          status?: string
        }
        Update: {
          amount?: number
          id?: string
          pix_key?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_withdrawals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          closed_at: string | null
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          closed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_product_likes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_admin_by_email: { Args: { _email: string }; Returns: undefined }
      can_request_refund: { Args: { order_id: string }; Returns: boolean }
      generate_meta_description: {
        Args: { description: string; name: string; price: number }
        Returns: string
      }
      generate_product_tags: {
        Args: { category: string; description: string; name: string }
        Returns: string[]
      }
      generate_slug: { Args: { name: string }; Returns: string }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      release_seller_balance: { Args: never; Returns: undefined }
      reset_monthly_refunds: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
