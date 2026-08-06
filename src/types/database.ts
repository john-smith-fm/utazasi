export type TimelineActivityKind = "plan" | "travel";
export type TripMemberRole = "owner" | "member";

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: { id: string; user_id: string | null; slug: string; name: string; destination: string; start_date: string | null; end_date: string | null; created_at: string };
        Insert: { id?: string; user_id?: string | null; slug: string; name: string; destination: string; start_date?: string | null; end_date?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["trips"]["Insert"]>;
        Relationships: [];
      };
      days: {
        Row: { id: string; trip_id: string; date: string; title: string; subtitle: string | null; created_at: string };
        Insert: { id?: string; trip_id: string; date: string; title: string; subtitle?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["days"]["Insert"]>;
        Relationships: [{ foreignKeyName: "days_trip_id_fkey"; columns: ["trip_id"]; referencedRelation: "trips"; referencedColumns: ["id"] }];
      };
      timeline_activities: {
        Row: { id: string; day_id: string; start_time: string; duration_minutes: number; title: string; description: string | null; location_name: string | null; kind: TimelineActivityKind; is_system_generated: boolean; seed_key: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; day_id: string; start_time: string; duration_minutes: number; title: string; description?: string | null; location_name?: string | null; kind?: TimelineActivityKind; is_system_generated?: boolean; seed_key?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["timeline_activities"]["Insert"]>;
        Relationships: [{ foreignKeyName: "timeline_activities_day_id_fkey"; columns: ["day_id"]; referencedRelation: "days"; referencedColumns: ["id"] }];
      };
      trip_members: {
        Row: { id: string; trip_id: string; email: string; email_normalized: string; user_id: string | null; role: TripMemberRole; invited_at: string; accepted_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; trip_id: string; email: string; email_normalized?: never; user_id?: string | null; role?: TripMemberRole; invited_at?: string; accepted_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["trip_members"]["Insert"]>;
        Relationships: [{ foreignKeyName: "trip_members_trip_id_fkey"; columns: ["trip_id"]; referencedRelation: "trips"; referencedColumns: ["id"] }];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { timeline_activity_kind: TimelineActivityKind; trip_member_role: TripMemberRole };
    CompositeTypes: Record<string, never>;
  };
}
