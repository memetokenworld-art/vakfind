// Ręcznie napisane typy odpowiadające schematowi z supabase/migrations/*.sql.
//
// To NIE jest pełny, wygenerowany automatycznie plik (żeby go uzyskać, trzeba
// by uruchomić `supabase gen types typescript --project-id kohvisawafhogyadprwq`
// z maszyny, która ma dostęp do internetu do Supabase — środowisko, w którym
// pracuję, ma to zablokowane polityką sieciową). Zawiera na razie tabele/
// funkcje faktycznie używane przez aplikację; dopisuj kolejne w miarę potrzeb,
// trzymając się dokładnie kolumn z plików migracji.
//
// Uwaga: każdy typ Row/Insert/Update jest zdefiniowany jako samodzielny,
// NAZWANY typ (nie odwołuje się przez indeksowanie do samego typu Database) —
// samoodwołania w trakcie definiowania Database psują wnioskowanie typów
// głęboko w bibliotece supabase-js (np. przy wywołaniach .rpc()).

type ProfileRow = {
  id: string;
  account_type: "client" | "professional";
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileInsert = {
  id: string;
  account_type: "client" | "professional";
  full_name: string;
  avatar_url?: string | null;
  city?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type CategoryRow = {
  id: string;
  name: string;
  name_pl: string | null;
  slug: string;
  parent_id: string | null;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
};

type CategoryInsert = Partial<CategoryRow> & { name: string; slug: string };

type CategorySynonymRow = {
  id: string;
  category_id: string;
  synonym: string;
  language: "nl" | "en";
  created_at: string;
};

type CategorySynonymInsert = {
  id?: string;
  category_id: string;
  synonym: string;
  language?: "nl" | "en";
};

type ProfessionalProfileRow = {
  profile_id: string;
  kvk_number: string;
  kvk_company_name: string | null;
  kvk_verification_status: "unverified" | "pending" | "verified" | "rejected";
  kvk_verified_at: string | null;
  bio: string | null;
  years_of_experience: number | null;
  has_own_tools: boolean;
  tools_description: string | null;
  reads_technical_drawings: boolean;
  team_size: number | null;
  service_radius_km: number;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  has_liability_insurance: boolean;
  vak_score: number;
  review_avg_rating: number;
  review_count: number;
  completed_orders_count: number;
  unlocked_orders_count: number;
  profile_completeness: number;
  created_at: string;
  updated_at: string;
};

type ProfessionalProfileInsert = {
  profile_id: string;
  kvk_number: string;
  bio?: string | null;
  years_of_experience?: number | null;
  has_own_tools?: boolean;
  reads_technical_drawings?: boolean;
  service_radius_km?: number;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
};

type OrderRow = {
  id: string;
  client_id: string;
  category_id: string;
  title: string;
  description: string;
  status: "active" | "in_progress" | "completed" | "closed";
  budget_min: number | null;
  budget_max: number | null;
  city: string;
  postal_code: string;
  full_address: string | null;
  preferred_date: string | null;
  assigned_professional_id: string | null;
  in_progress_started_at: string | null;
  in_progress_expires_at: string | null;
  closed_reason: "no_client_response" | "client_cancelled" | "other" | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type OrderInsert = {
  id?: string;
  client_id: string;
  category_id: string;
  title: string;
  description: string;
  city: string;
  postal_code: string;
  full_address?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_date?: string | null;
};

type OrdersPublicRow = Omit<OrderRow, "full_address"> & {
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
};

type SearchCategoriesReturn = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  match_score: number;
}[];

type ProfileContactRow = {
  profile_id: string;
  phone: string | null;
  email: string;
  street_address: string | null;
  updated_at: string;
};

type ProfileContactInsert = {
  profile_id: string;
  phone?: string | null;
  email: string;
  street_address?: string | null;
};

type ProfessionalCategoryRow = {
  professional_id: string;
  category_id: string;
  created_at: string;
};

type ProfessionalCategoryInsert = {
  professional_id: string;
  category_id: string;
};

type PortfolioPhotoRow = {
  id: string;
  professional_id: string;
  photo_url: string;
  caption: string | null;
  moderation_status: "pending" | "approved" | "rejected";
  reported_count: number;
  created_at: string;
};

type PortfolioPhotoInsert = {
  id?: string;
  professional_id: string;
  photo_url: string;
  caption?: string | null;
};

type OrderContactUnlockRow = {
  id: string;
  order_id: string;
  professional_id: string;
  price: number;
  wallet_transaction_id: string | null;
  unlocked_at: string;
  refunded_at: string | null;
  refund_wallet_transaction_id: string | null;
};

type OrderContactUnlockInsert = {
  order_id: string;
  professional_id: string;
};

type UnlockProfessionalContactRow = {
  id: string;
  client_id: string;
  professional_id: string;
  price: number;
  wallet_transaction_id: string | null;
  unlocked_at: string;
};

type UnlockOrderContactRow = {
  id: string;
  order_id: string;
  professional_id: string;
  price: number;
  wallet_transaction_id: string | null;
  unlocked_at: string;
  refunded_at: string | null;
  refund_wallet_transaction_id: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: CategoryInsert;
        Update: Partial<CategoryRow>;
        Relationships: [];
      };
      category_synonyms: {
        Row: CategorySynonymRow;
        Insert: CategorySynonymInsert;
        Update: Partial<CategorySynonymInsert>;
        Relationships: [];
      };
      professional_profiles: {
        Row: ProfessionalProfileRow;
        Insert: ProfessionalProfileInsert;
        Update: Partial<ProfessionalProfileRow>;
        Relationships: [
          {
            foreignKeyName: "professional_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: OrderRow;
        Insert: OrderInsert;
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      profile_contacts: {
        Row: ProfileContactRow;
        Insert: ProfileContactInsert;
        Update: Partial<ProfileContactInsert>;
        Relationships: [];
      };
      professional_categories: {
        Row: ProfessionalCategoryRow;
        Insert: ProfessionalCategoryInsert;
        Update: Partial<ProfessionalCategoryInsert>;
        Relationships: [];
      };
      professional_portfolio_photos: {
        Row: PortfolioPhotoRow;
        Insert: PortfolioPhotoInsert;
        Update: Partial<PortfolioPhotoInsert>;
        Relationships: [];
      };
      order_contact_unlocks: {
        Row: OrderContactUnlockRow;
        Insert: OrderContactUnlockInsert;
        Update: Partial<OrderContactUnlockInsert>;
        Relationships: [];
      };
    };
    Views: {
      orders_public: {
        Row: OrdersPublicRow;
        Relationships: [];
      };
    };
    Functions: {
      search_categories: {
        Args: { query: string };
        Returns: SearchCategoriesReturn;
      };
      unlock_professional_contact: {
        Args: { p_professional_id: string };
        Returns: UnlockProfessionalContactRow;
      };
      unlock_order_contact: {
        Args: { p_order_id: string };
        Returns: UnlockOrderContactRow;
      };
      complete_order: {
        Args: { p_order_id: string };
        Returns: OrderRow;
      };
      reopen_order: {
        Args: { p_order_id: string };
        Returns: OrderRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
