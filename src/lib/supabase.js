import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sxndojgvrhjmclveyfoz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmRvamd2cmhqbWNsdmV5Zm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMjc3NzksImV4cCI6MjA1NjYwMzc3OX0.0Y51JuSUVICIekt5yq0K2C6i6j2risQKz3FUSTeWHLE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);