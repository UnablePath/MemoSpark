// Basic Database type definition for Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name?: string;
          year_of_study?: string;
          subjects?: string[];
          interests?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string;
          year_of_study?: string;
          subjects?: string[];
          interests?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          year_of_study?: string;
          subjects?: string[];
          interests?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description?: string;
          due_date?: string;
          priority?: 'low' | 'medium' | 'high';
          type?: 'academic' | 'personal';
          subject?: string;
          completed: boolean;
          reminder: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          due_date?: string;
          priority?: 'low' | 'medium' | 'high';
          type?: 'academic' | 'personal';
          subject?: string;
          completed?: boolean;
          reminder?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          due_date?: string;
          priority?: 'low' | 'medium' | 'high';
          type?: 'academic' | 'personal';
          subject?: string;
          completed?: boolean;
          reminder?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          theme?: string;
          high_contrast?: boolean;
          reduced_motion?: boolean;
          font_size?: string;
          notifications?: Record<string, any>;
          accessibility?: Record<string, any>;
          privacy?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: string;
          high_contrast?: boolean;
          reduced_motion?: boolean;
          font_size?: string;
          notifications?: Record<string, any>;
          accessibility?: Record<string, any>;
          privacy?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: string;
          high_contrast?: boolean;
          reduced_motion?: boolean;
          font_size?: string;
          notifications?: Record<string, any>;
          accessibility?: Record<string, any>;
          privacy?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}; 