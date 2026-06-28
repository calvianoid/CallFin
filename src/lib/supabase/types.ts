/**
 * Hand-written DB types mirroring supabase/migrations/.
 * Once the schema is deployed you can replace this with auto-generated types via:
 *   npx supabase gen types typescript --project-id <ID> --schema public > src/lib/supabase/types.gen.ts
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          locale: "id" | "en";
          theme: "light" | "dark" | "system";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["profiles"]["Row"], "id">> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "cash" | "bank" | "ewallet" | "credit";
          balance: number;
          color: string;
          icon: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wallets"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wallets"]["Row"]>;
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "income" | "expense";
          color: string;
          icon: string | null;
          is_default: boolean;
          is_internal: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at" | "is_default" | "is_internal"> & {
          id?: string;
          created_at?: string;
          is_default?: boolean;
          is_internal?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          wallet_id: string;
          type: "income" | "expense" | "transfer";
          amount: number;
          category: string;
          description: string;
          date: string;
          goal_id: string | null;
          transfer_to_wallet_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          limit_amount: number;
          month_year: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["budgets"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Row"]>;
      };
      budget_caps: {
        Row: {
          id: string;
          user_id: string;
          total_amount: number;
          month_year: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["budget_caps"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budget_caps"]["Row"]>;
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          goal_name: string;
          target_amount: number;
          current_amount: number;
          deadline: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["goals"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Row"]>;
      };
      chat_history: {
        Row: {
          id: string;
          user_id: string;
          role: "user" | "assistant";
          message: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chat_history"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_history"]["Row"]>;
      };
    };
    Views: {
      budget_status: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          limit_amount: number;
          month_year: string;
          spent: number;
        };
      };
    };
    Functions: {
      do_transfer: {
        Args: {
          p_from_wallet: string;
          p_to_wallet: string;
          p_amount: number;
          p_description?: string | null;
        };
        Returns: string;
      };
      do_goal_contribution: {
        Args: {
          p_goal_id: string;
          p_wallet_id: string;
          p_amount: number;
          p_note?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      wallet_type: "cash" | "bank" | "ewallet" | "credit";
      category_type: "income" | "expense";
      transaction_type: "income" | "expense" | "transfer";
      chat_role: "user" | "assistant";
    };
  };
};
