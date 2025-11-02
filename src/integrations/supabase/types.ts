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
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_verification_process: {
        Row: {
          admin_id: string | null
          admin_name: string | null
          code_used_at: string | null
          code_used_by: string | null
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: string | null
          status: string
          updated_at: string | null
          user_id: string
          verification_code: string
        }
        Insert: {
          admin_id?: string | null
          admin_name?: string | null
          code_used_at?: string | null
          code_used_by?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          verification_code: string
        }
        Update: {
          admin_id?: string | null
          admin_name?: string | null
          code_used_at?: string | null
          code_used_by?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          verification_code?: string
        }
        Relationships: []
      }
      ai_actions: {
        Row: {
          action: string | null
          id: number
          magnitude: number | null
          note: string | null
          ts: string | null
        }
        Insert: {
          action?: string | null
          id?: number
          magnitude?: number | null
          note?: string | null
          ts?: string | null
        }
        Update: {
          action?: string | null
          id?: number
          magnitude?: number | null
          note?: string | null
          ts?: string | null
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          endpoint: string
          id: string
          method: string
          requests_per_second: number | null
          response_time_ms: number | null
          status_code: number | null
          timestamp: string | null
        }
        Insert: {
          endpoint: string
          id?: string
          method: string
          requests_per_second?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string | null
        }
        Update: {
          endpoint?: string
          id?: string
          method?: string
          requests_per_second?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string | null
        }
        Relationships: []
      }
      ark_decision_audit: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          decision_type: string
          ensemble_weights: Json | null
          executed: boolean | null
          final_prediction: Json
          id: string
          model_predictions: Json
          outcome: Json | null
          risk_assessment: Json | null
          sentiment_analysis: Json | null
          symbol: string
          timestamp: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          decision_type: string
          ensemble_weights?: Json | null
          executed?: boolean | null
          final_prediction: Json
          id?: string
          model_predictions: Json
          outcome?: Json | null
          risk_assessment?: Json | null
          sentiment_analysis?: Json | null
          symbol: string
          timestamp?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          decision_type?: string
          ensemble_weights?: Json | null
          executed?: boolean | null
          final_prediction?: Json
          id?: string
          model_predictions?: Json
          outcome?: Json | null
          risk_assessment?: Json | null
          sentiment_analysis?: Json | null
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      ark_model_performance: {
        Row: {
          accuracy: number | null
          created_at: string | null
          f1_score: number | null
          id: string
          max_drawdown: number | null
          metadata: Json | null
          model_id: string | null
          precision_score: number | null
          profit_factor: number | null
          recall_score: number | null
          sharpe_ratio: number | null
          timestamp: string
          total_trades: number | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          f1_score?: number | null
          id?: string
          max_drawdown?: number | null
          metadata?: Json | null
          model_id?: string | null
          precision_score?: number | null
          profit_factor?: number | null
          recall_score?: number | null
          sharpe_ratio?: number | null
          timestamp?: string
          total_trades?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          f1_score?: number | null
          id?: string
          max_drawdown?: number | null
          metadata?: Json | null
          model_id?: string | null
          precision_score?: number | null
          profit_factor?: number | null
          recall_score?: number | null
          sharpe_ratio?: number | null
          timestamp?: string
          total_trades?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ark_model_performance_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ark_sentiment_analysis: {
        Row: {
          confidence_score: number | null
          correlation_sentiment: number | null
          created_at: string | null
          fear_greed_index: number | null
          id: string
          market_strength: number | null
          metadata: Json | null
          overall_sentiment: number
          price_action_sentiment: number | null
          symbol: string
          timestamp: string
          volatility_sentiment: number | null
          volume_sentiment: number | null
        }
        Insert: {
          confidence_score?: number | null
          correlation_sentiment?: number | null
          created_at?: string | null
          fear_greed_index?: number | null
          id?: string
          market_strength?: number | null
          metadata?: Json | null
          overall_sentiment: number
          price_action_sentiment?: number | null
          symbol: string
          timestamp?: string
          volatility_sentiment?: number | null
          volume_sentiment?: number | null
        }
        Update: {
          confidence_score?: number | null
          correlation_sentiment?: number | null
          created_at?: string | null
          fear_greed_index?: number | null
          id?: string
          market_strength?: number | null
          metadata?: Json | null
          overall_sentiment?: number
          price_action_sentiment?: number | null
          symbol?: string
          timestamp?: string
          volatility_sentiment?: number | null
          volume_sentiment?: number | null
        }
        Relationships: []
      }
      ark_training_history: {
        Row: {
          accuracy_history: Json | null
          created_at: string | null
          hyperparameters: Json | null
          id: string
          loss_history: Json | null
          model_id: string | null
          status: string
          training_end: string | null
          training_metrics: Json | null
          training_start: string
          validation_metrics: Json | null
        }
        Insert: {
          accuracy_history?: Json | null
          created_at?: string | null
          hyperparameters?: Json | null
          id?: string
          loss_history?: Json | null
          model_id?: string | null
          status?: string
          training_end?: string | null
          training_metrics?: Json | null
          training_start?: string
          validation_metrics?: Json | null
        }
        Update: {
          accuracy_history?: Json | null
          created_at?: string | null
          hyperparameters?: Json | null
          id?: string
          loss_history?: Json | null
          model_id?: string | null
          status?: string
          training_end?: string | null
          training_metrics?: Json | null
          training_start?: string
          validation_metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ark_training_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_entities: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          entity_type: string
          entity_value: string
          id: string
          reason: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          entity_type: string
          entity_value: string
          id?: string
          reason: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          entity_type?: string
          entity_value?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      broadcast_views: {
        Row: {
          broadcast_id: string
          created_at: string | null
          id: string
          last_viewed_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          broadcast_id: string
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          broadcast_id?: string
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_views_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "system_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      config_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_encrypted: boolean | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          ark_id: string | null
          created_at: string | null
          current_balance: number | null
          date: string | null
          drive_path: string | null
          id: string
          loss_per_symbol: Json | null
          max_drawdown: number | null
          profit_per_symbol: Json | null
          report_generated: boolean | null
          report_sent: boolean | null
          session_id: string | null
          sharpe_ratio: number | null
          today_vs_yesterday: Json | null
          top_loss_symbols: Json | null
          top_profit_symbols: Json | null
          total_daily_loss: number | null
          total_daily_profit: number | null
          total_trades: number | null
          user_id: string | null
          win_rate: number | null
        }
        Insert: {
          ark_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          date?: string | null
          drive_path?: string | null
          id?: string
          loss_per_symbol?: Json | null
          max_drawdown?: number | null
          profit_per_symbol?: Json | null
          report_generated?: boolean | null
          report_sent?: boolean | null
          session_id?: string | null
          sharpe_ratio?: number | null
          today_vs_yesterday?: Json | null
          top_loss_symbols?: Json | null
          top_profit_symbols?: Json | null
          total_daily_loss?: number | null
          total_daily_profit?: number | null
          total_trades?: number | null
          user_id?: string | null
          win_rate?: number | null
        }
        Update: {
          ark_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          date?: string | null
          drive_path?: string | null
          id?: string
          loss_per_symbol?: Json | null
          max_drawdown?: number | null
          profit_per_symbol?: Json | null
          report_generated?: boolean | null
          report_sent?: boolean | null
          session_id?: string | null
          sharpe_ratio?: number | null
          today_vs_yesterday?: Json | null
          top_loss_symbols?: Json | null
          top_profit_symbols?: Json | null
          total_daily_loss?: number | null
          total_daily_profit?: number | null
          total_trades?: number | null
          user_id?: string | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_metrics: {
        Row: {
          created_at: string | null
          duplicate_records: number | null
          id: string
          invalid_records: number | null
          issues: Json | null
          missing_fields: number | null
          outliers_detected: number | null
          quality_score: number | null
          source: string
          timestamp: string | null
          total_records: number | null
          valid_records: number | null
        }
        Insert: {
          created_at?: string | null
          duplicate_records?: number | null
          id?: string
          invalid_records?: number | null
          issues?: Json | null
          missing_fields?: number | null
          outliers_detected?: number | null
          quality_score?: number | null
          source: string
          timestamp?: string | null
          total_records?: number | null
          valid_records?: number | null
        }
        Update: {
          created_at?: string | null
          duplicate_records?: number | null
          id?: string
          invalid_records?: number | null
          issues?: Json | null
          missing_fields?: number | null
          outliers_detected?: number | null
          quality_score?: number | null
          source?: string
          timestamp?: string | null
          total_records?: number | null
          valid_records?: number | null
        }
        Relationships: []
      }
      device_data: {
        Row: {
          browser: string | null
          browser_version: string | null
          color_depth: number | null
          connection_type: string | null
          cores: number | null
          created_at: string
          device_type: string
          id: string
          language: string | null
          memory_gb: number | null
          orientation: string | null
          os: string | null
          pixel_ratio: number
          screen_height: number
          screen_width: number
          timezone: string | null
          touch_support: boolean | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
          viewport_height: number
          viewport_width: number
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          color_depth?: number | null
          connection_type?: string | null
          cores?: number | null
          created_at?: string
          device_type: string
          id?: string
          language?: string | null
          memory_gb?: number | null
          orientation?: string | null
          os?: string | null
          pixel_ratio?: number
          screen_height: number
          screen_width: number
          timezone?: string | null
          touch_support?: boolean | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          viewport_height: number
          viewport_width: number
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          color_depth?: number | null
          connection_type?: string | null
          cores?: number | null
          created_at?: string
          device_type?: string
          id?: string
          language?: string | null
          memory_gb?: number | null
          orientation?: string | null
          os?: string | null
          pixel_ratio?: number
          screen_height?: number
          screen_width?: number
          timezone?: string | null
          touch_support?: boolean | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number
          viewport_width?: number
        }
        Relationships: []
      }
      device_metadata: {
        Row: {
          available_screen_height: number | null
          available_screen_width: number | null
          collected_at: string
          color_depth: number | null
          connection_downlink: number | null
          connection_type: string | null
          cookies_enabled: boolean | null
          country_code: string | null
          created_at: string
          device_memory: number | null
          device_name: string | null
          do_not_track: string | null
          hardware_concurrency: number | null
          id: string
          ip_address: string | null
          language: string | null
          languages: string[] | null
          max_touch_points: number | null
          online: boolean | null
          pixel_ratio: number | null
          platform: string | null
          screen_height: number | null
          screen_orientation: string | null
          screen_width: number | null
          timezone: string | null
          touch_support: boolean | null
          user_agent: string | null
          vendor: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_id: string | null
        }
        Insert: {
          available_screen_height?: number | null
          available_screen_width?: number | null
          collected_at?: string
          color_depth?: number | null
          connection_downlink?: number | null
          connection_type?: string | null
          cookies_enabled?: boolean | null
          country_code?: string | null
          created_at?: string
          device_memory?: number | null
          device_name?: string | null
          do_not_track?: string | null
          hardware_concurrency?: number | null
          id?: string
          ip_address?: string | null
          language?: string | null
          languages?: string[] | null
          max_touch_points?: number | null
          online?: boolean | null
          pixel_ratio?: number | null
          platform?: string | null
          screen_height?: number | null
          screen_orientation?: string | null
          screen_width?: number | null
          timezone?: string | null
          touch_support?: boolean | null
          user_agent?: string | null
          vendor?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string | null
        }
        Update: {
          available_screen_height?: number | null
          available_screen_width?: number | null
          collected_at?: string
          color_depth?: number | null
          connection_downlink?: number | null
          connection_type?: string | null
          cookies_enabled?: boolean | null
          country_code?: string | null
          created_at?: string
          device_memory?: number | null
          device_name?: string | null
          do_not_track?: string | null
          hardware_concurrency?: number | null
          id?: string
          ip_address?: string | null
          language?: string | null
          languages?: string[] | null
          max_touch_points?: number | null
          online?: boolean | null
          pixel_ratio?: number | null
          platform?: string | null
          screen_height?: number | null
          screen_orientation?: string | null
          screen_width?: number | null
          timezone?: string | null
          touch_support?: boolean | null
          user_agent?: string | null
          vendor?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      encrypted_secrets: {
        Row: {
          created_at: string | null
          encrypted_value: string
          encryption_key_id: string
          id: string
          secret_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_value: string
          encryption_key_id: string
          id?: string
          secret_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_value?: string
          encryption_key_id?: string
          id?: string
          secret_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      historical_data_cache: {
        Row: {
          close: number
          created_at: string | null
          high: number
          id: string
          low: number
          open: number
          symbol: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          close: number
          created_at?: string | null
          high: number
          id?: string
          low: number
          open: number
          symbol: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          close?: number
          created_at?: string | null
          high?: number
          id?: string
          low?: number
          open?: number
          symbol?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      kill_switch_config: {
        Row: {
          action: string
          ark_id: string | null
          condition_type: string
          created_at: string | null
          enabled: boolean | null
          id: string
          level: number
          threshold: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          ark_id?: string | null
          condition_type: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          level: number
          threshold: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          ark_id?: string | null
          condition_type?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          level?: number
          threshold?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      market_data_cache: {
        Row: {
          ask: number
          bid: number
          created_at: string | null
          id: string
          symbol: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          ask: number
          bid: number
          created_at?: string | null
          id?: string
          symbol: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          ask?: number
          bid?: number
          created_at?: string | null
          id?: string
          symbol?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      ml_models: {
        Row: {
          accuracy: number | null
          created_at: string | null
          drive_path: string | null
          id: string
          last_prediction: string | null
          last_retrain_trigger: string | null
          max_drawdown: number | null
          model_name: string
          model_type: string
          performance_degradation: number | null
          precision_score: number | null
          profit_factor: number | null
          recall_score: number | null
          retrain_count: number | null
          sharpe_ratio: number | null
          status: string | null
          total_trades: number | null
          training_end: string | null
          training_start: string | null
          updated_at: string | null
          version: string
          winning_trades: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          drive_path?: string | null
          id?: string
          last_prediction?: string | null
          last_retrain_trigger?: string | null
          max_drawdown?: number | null
          model_name: string
          model_type: string
          performance_degradation?: number | null
          precision_score?: number | null
          profit_factor?: number | null
          recall_score?: number | null
          retrain_count?: number | null
          sharpe_ratio?: number | null
          status?: string | null
          total_trades?: number | null
          training_end?: string | null
          training_start?: string | null
          updated_at?: string | null
          version: string
          winning_trades?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          drive_path?: string | null
          id?: string
          last_prediction?: string | null
          last_retrain_trigger?: string | null
          max_drawdown?: number | null
          model_name?: string
          model_type?: string
          performance_degradation?: number | null
          precision_score?: number | null
          profit_factor?: number | null
          recall_score?: number | null
          retrain_count?: number | null
          sharpe_ratio?: number | null
          status?: string | null
          total_trades?: number | null
          training_end?: string | null
          training_start?: string | null
          updated_at?: string | null
          version?: string
          winning_trades?: number | null
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          actual_outcome: string | null
          ark_id: string | null
          confidence: number
          created_at: string | null
          direction: string
          executed: boolean | null
          execution_time: string | null
          features: Json | null
          id: string
          model_id: string | null
          prediction_time: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          target_price: number | null
          timeframe: string | null
          user_id: string | null
        }
        Insert: {
          actual_outcome?: string | null
          ark_id?: string | null
          confidence: number
          created_at?: string | null
          direction: string
          executed?: boolean | null
          execution_time?: string | null
          features?: Json | null
          id?: string
          model_id?: string | null
          prediction_time?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          target_price?: number | null
          timeframe?: string | null
          user_id?: string | null
        }
        Update: {
          actual_outcome?: string | null
          ark_id?: string | null
          confidence?: number
          created_at?: string | null
          direction?: string
          executed?: boolean | null
          execution_time?: string | null
          features?: Json | null
          id?: string
          model_id?: string | null
          prediction_time?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          target_price?: number | null
          timeframe?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_ab_tests: {
        Row: {
          confidence_level: number | null
          created_at: string | null
          end_date: string | null
          id: string
          model_a_id: string | null
          model_a_pnl: number | null
          model_a_trades: number | null
          model_a_win_rate: number | null
          model_b_id: string | null
          model_b_pnl: number | null
          model_b_trades: number | null
          model_b_win_rate: number | null
          split_ratio: number | null
          start_date: string | null
          status: string | null
          symbol: string
          test_name: string
          updated_at: string | null
          winner: string | null
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          model_a_id?: string | null
          model_a_pnl?: number | null
          model_a_trades?: number | null
          model_a_win_rate?: number | null
          model_b_id?: string | null
          model_b_pnl?: number | null
          model_b_trades?: number | null
          model_b_win_rate?: number | null
          split_ratio?: number | null
          start_date?: string | null
          status?: string | null
          symbol: string
          test_name: string
          updated_at?: string | null
          winner?: string | null
        }
        Update: {
          confidence_level?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          model_a_id?: string | null
          model_a_pnl?: number | null
          model_a_trades?: number | null
          model_a_win_rate?: number | null
          model_b_id?: string | null
          model_b_pnl?: number | null
          model_b_trades?: number | null
          model_b_win_rate?: number | null
          split_ratio?: number | null
          start_date?: string | null
          status?: string | null
          symbol?: string
          test_name?: string
          updated_at?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_ab_tests_model_a_id_fkey"
            columns: ["model_a_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_ab_tests_model_b_id_fkey"
            columns: ["model_b_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_performance_history: {
        Row: {
          accuracy: number | null
          alert_triggered: boolean | null
          created_at: string | null
          degradation_score: number | null
          id: string
          max_drawdown: number | null
          model_id: string | null
          sharpe_ratio: number | null
          timestamp: string | null
          total_trades: number | null
          win_rate: number | null
        }
        Insert: {
          accuracy?: number | null
          alert_triggered?: boolean | null
          created_at?: string | null
          degradation_score?: number | null
          id?: string
          max_drawdown?: number | null
          model_id?: string | null
          sharpe_ratio?: number | null
          timestamp?: string | null
          total_trades?: number | null
          win_rate?: number | null
        }
        Update: {
          accuracy?: number | null
          alert_triggered?: boolean | null
          created_at?: string | null
          degradation_score?: number | null
          id?: string
          max_drawdown?: number | null
          model_id?: string | null
          sharpe_ratio?: number | null
          timestamp?: string | null
          total_trades?: number | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_performance_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_symbol_performance: {
        Row: {
          avg_loss: number
          avg_win: number
          created_at: string | null
          id: string
          last_updated: string | null
          model_id: string | null
          symbol: string
          total_trades: number
          win_rate: number
        }
        Insert: {
          avg_loss?: number
          avg_win?: number
          created_at?: string | null
          id?: string
          last_updated?: string | null
          model_id?: string | null
          symbol: string
          total_trades?: number
          win_rate?: number
        }
        Update: {
          avg_loss?: number
          avg_win?: number
          created_at?: string | null
          id?: string
          last_updated?: string | null
          model_id?: string | null
          symbol?: string
          total_trades?: number
          win_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_symbol_performance_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_weights: {
        Row: {
          architecture: Json | null
          created_at: string | null
          deployment_date: string | null
          id: string
          is_active: boolean | null
          model_id: string | null
          model_type: string
          performance_score: number | null
          symbol: string
          training_accuracy: number | null
          validation_accuracy: number | null
          version: number
          weights_data: Json
        }
        Insert: {
          architecture?: Json | null
          created_at?: string | null
          deployment_date?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          model_type: string
          performance_score?: number | null
          symbol: string
          training_accuracy?: number | null
          validation_accuracy?: number | null
          version?: number
          weights_data: Json
        }
        Update: {
          architecture?: Json | null
          created_at?: string | null
          deployment_date?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          model_type?: string
          performance_score?: number | null
          symbol?: string
          training_accuracy?: number | null
          validation_accuracy?: number | null
          version?: number
          weights_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "model_weights_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          created_at: string | null
          id: number
          model_type: string | null
          s3_key: string | null
          symbol: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          model_type?: string | null
          s3_key?: string | null
          symbol?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          model_type?: string | null
          s3_key?: string | null
          symbol?: string | null
          version?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          ark_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ark_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ark_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          ark_id: string | null
          close_reason: string | null
          closed_at: string | null
          created_at: string | null
          current_price: number | null
          deal_id: string
          direction: string
          entry_price: number
          id: string
          opened_at: string | null
          pnl: number | null
          session_id: string | null
          size: number
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ark_id?: string | null
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          current_price?: number | null
          deal_id: string
          direction: string
          entry_price: number
          id?: string
          opened_at?: string | null
          pnl?: number | null
          session_id?: string | null
          size: number
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ark_id?: string | null
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          current_price?: number | null
          deal_id?: string
          direction?: string
          entry_price?: number
          id?: string
          opened_at?: string | null
          pnl?: number | null
          session_id?: string | null
          size?: number
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ark_id: string
          country_code: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          suspended: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          ark_id: string
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          suspended?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          ark_id?: string
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          suspended?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      risk_metrics: {
        Row: {
          account_balance: number | null
          ark_id: string | null
          correlation_risk: number | null
          created_at: string | null
          current_drawdown: number | null
          daily_pnl: number | null
          daily_trades_count: number | null
          equity: number | null
          free_margin: number | null
          id: string
          margin_level: number | null
          open_positions: number | null
          risk_utilization: number | null
          session_id: string | null
          timestamp: string | null
          used_margin: number | null
          user_id: string | null
        }
        Insert: {
          account_balance?: number | null
          ark_id?: string | null
          correlation_risk?: number | null
          created_at?: string | null
          current_drawdown?: number | null
          daily_pnl?: number | null
          daily_trades_count?: number | null
          equity?: number | null
          free_margin?: number | null
          id?: string
          margin_level?: number | null
          open_positions?: number | null
          risk_utilization?: number | null
          session_id?: string | null
          timestamp?: string | null
          used_margin?: number | null
          user_id?: string | null
        }
        Update: {
          account_balance?: number | null
          ark_id?: string | null
          correlation_risk?: number | null
          created_at?: string | null
          current_drawdown?: number | null
          daily_pnl?: number | null
          daily_trades_count?: number | null
          equity?: number | null
          free_margin?: number | null
          id?: string
          margin_level?: number | null
          open_positions?: number | null
          risk_utilization?: number | null
          session_id?: string | null
          timestamp?: string | null
          used_margin?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rl_rewards: {
        Row: {
          created_at: string | null
          daily_loss_limit: number | null
          daily_profit_cap: number | null
          date: string | null
          final_reward: number | null
          id: string
          loss_severity: number | null
          max_single_loss: number | null
          net_pnl: number | null
          reward_components: Json | null
          session_id: string | null
          total_loss: number | null
          total_profit: number | null
          total_trades: number | null
          trade_efficiency: number | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          created_at?: string | null
          daily_loss_limit?: number | null
          daily_profit_cap?: number | null
          date?: string | null
          final_reward?: number | null
          id?: string
          loss_severity?: number | null
          max_single_loss?: number | null
          net_pnl?: number | null
          reward_components?: Json | null
          session_id?: string | null
          total_loss?: number | null
          total_profit?: number | null
          total_trades?: number | null
          trade_efficiency?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          created_at?: string | null
          daily_loss_limit?: number | null
          daily_profit_cap?: number | null
          date?: string | null
          final_reward?: number | null
          id?: string
          loss_severity?: number | null
          max_single_loss?: number | null
          net_pnl?: number | null
          reward_components?: Json | null
          session_id?: string | null
          total_loss?: number | null
          total_profit?: number | null
          total_trades?: number | null
          trade_efficiency?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rl_rewards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_questions: {
        Row: {
          answer_hash: string
          created_at: string | null
          id: string
          question: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer_hash: string
          created_at?: string | null
          id?: string
          question: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answer_hash?: string
          created_at?: string | null
          id?: string
          question?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      storage_metadata: {
        Row: {
          content_type: string
          created_at: string
          id: string
          metadata: Json | null
          path: string
          size_bytes: number
          storage_tier: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          path: string
          size_bytes?: number
          storage_tier: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          path?: string
          size_bytes?: number
          storage_tier?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      symbol_stats: {
        Row: {
          avg_trade_duration: unknown
          correlation_matrix: Json | null
          created_at: string | null
          date: string | null
          id: string
          max_loss: number | null
          max_profit: number | null
          net_pnl: number | null
          symbol: string
          total_loss: number | null
          total_profit: number | null
          total_trades: number | null
          updated_at: string | null
          volatility: number | null
          winning_trades: number | null
        }
        Insert: {
          avg_trade_duration?: unknown
          correlation_matrix?: Json | null
          created_at?: string | null
          date?: string | null
          id?: string
          max_loss?: number | null
          max_profit?: number | null
          net_pnl?: number | null
          symbol: string
          total_loss?: number | null
          total_profit?: number | null
          total_trades?: number | null
          updated_at?: string | null
          volatility?: number | null
          winning_trades?: number | null
        }
        Update: {
          avg_trade_duration?: unknown
          correlation_matrix?: Json | null
          created_at?: string | null
          date?: string | null
          id?: string
          max_loss?: number | null
          max_profit?: number | null
          net_pnl?: number | null
          symbol?: string
          total_loss?: number | null
          total_profit?: number | null
          total_trades?: number | null
          updated_at?: string | null
          volatility?: number | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      system_broadcasts: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_views_per_user: number | null
          message: string
          priority: string
          title: string
          type: Database["public"]["Enums"]["broadcast_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_views_per_user?: number | null
          message: string
          priority?: string
          title: string
          type?: Database["public"]["Enums"]["broadcast_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_views_per_user?: number | null
          message?: string
          priority?: string
          title?: string
          type?: Database["public"]["Enums"]["broadcast_type"]
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          details: Json | null
          id: string
          level: string
          message: string
          module: string
          session_id: string | null
          timestamp: string | null
        }
        Insert: {
          details?: Json | null
          id?: string
          level: string
          message: string
          module: string
          session_id?: string | null
          timestamp?: string | null
        }
        Update: {
          details?: Json | null
          id?: string
          level?: string
          message?: string
          module?: string
          session_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ticks: {
        Row: {
          id: number
          symbol: string | null
          tick: Json | null
          ts: string | null
        }
        Insert: {
          id?: number
          symbol?: string | null
          tick?: Json | null
          ts?: string | null
        }
        Update: {
          id?: number
          symbol?: string | null
          tick?: Json | null
          ts?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          ark_id: string | null
          id: number
          pnl: number | null
          price: number | null
          side: string
          size: number | null
          symbol: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          ark_id?: string | null
          id?: number
          pnl?: number | null
          price?: number | null
          side: string
          size?: number | null
          symbol: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          ark_id?: string | null
          id?: number
          pnl?: number | null
          price?: number | null
          side?: string
          size?: number | null
          symbol?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trading_sessions: {
        Row: {
          ark_id: string | null
          created_at: string | null
          final_balance: number | null
          id: string
          initial_balance: number | null
          losing_trades: number | null
          max_drawdown: number | null
          mode: string | null
          session_end: string | null
          session_start: string | null
          status: string | null
          total_trades: number | null
          user_id: string | null
          winning_trades: number | null
        }
        Insert: {
          ark_id?: string | null
          created_at?: string | null
          final_balance?: number | null
          id?: string
          initial_balance?: number | null
          losing_trades?: number | null
          max_drawdown?: number | null
          mode?: string | null
          session_end?: string | null
          session_start?: string | null
          status?: string | null
          total_trades?: number | null
          user_id?: string | null
          winning_trades?: number | null
        }
        Update: {
          ark_id?: string | null
          created_at?: string | null
          final_balance?: number | null
          id?: string
          initial_balance?: number | null
          losing_trades?: number | null
          max_drawdown?: number | null
          mode?: string | null
          session_end?: string | null
          session_start?: string | null
          status?: string | null
          total_trades?: number | null
          user_id?: string | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          id: string
          last_used: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          id?: string
          last_used?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          last_used?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_api_credentials: {
        Row: {
          api_key: string
          ark_id: string
          created_at: string
          id: string
          is_demo: boolean
          secret_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          ark_id: string
          created_at?: string
          id?: string
          is_demo?: boolean
          secret_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          ark_id?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          secret_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_notes: string | null
          ark_id: string
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ark_id: string
          category: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ark_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_trading_symbols: {
        Row: {
          ark_id: string | null
          created_at: string | null
          id: string
          symbols: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ark_id?: string | null
          created_at?: string | null
          id?: string
          symbols?: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ark_id?: string | null
          created_at?: string | null
          id?: string
          symbols?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_model_version: {
        Args: { p_model_type: string; p_symbol: string; p_version: number }
        Returns: boolean
      }
      cleanup_old_market_data: { Args: never; Returns: undefined }
      decrypt_credential_password:
        | { Args: { encrypted_password: string }; Returns: string }
        | {
            Args: { encrypted_password: string; encryption_key: string }
            Returns: string
          }
      encrypt_credential_password:
        | { Args: { plain_password: string }; Returns: string }
        | {
            Args: { encryption_key: string; plain_password: string }
            Returns: string
          }
      generate_ark_id: {
        Args: { country_code?: string; user_uuid: string }
        Returns: string
      }
      get_active_model_version: {
        Args: { p_model_type: string; p_symbol: string }
        Returns: {
          architecture: Json
          created_at: string
          id: string
          performance_score: number
          training_accuracy: number
          validation_accuracy: number
          version: number
          weights_data: Json
        }[]
      }
      get_current_ark_id: { Args: never; Returns: string }
      get_storage_metadata: {
        Args: { file_path: string }
        Returns: {
          content_type: string
          metadata: Json
          path: string
          size_bytes: number
          storage_tier: string
          uploaded_at: string
        }[]
      }
      get_user_email_by_username: {
        Args: { _username: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: {
        Args: { _entity_type: string; _entity_value: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      broadcast_type:
        | "announcement"
        | "maintenance"
        | "update"
        | "terms_change"
        | "urgent"
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
      app_role: ["admin", "moderator", "user"],
      broadcast_type: [
        "announcement",
        "maintenance",
        "update",
        "terms_change",
        "urgent",
      ],
    },
  },
} as const
