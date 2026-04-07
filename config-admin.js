const CONFIG = {
    SUPABASE_URL: 'https://xwkmhpcombsauoozyidi.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3a21ocGNvbWJzYXVvb3p5aWRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY5NDI4MSwiZXhwIjoyMDgyMjcwMjgxfQ.3g-n5vFfiHpZVwGwYLQpCYv2k4MpRqIdOZIX8cGt3hE',
    RESTAURANT_ID: '5b1b7ba9-eb12-4848-80f2-597149d52f3e'
};

// Cliente CRUD con service_role key — bypasea RLS, no usa localStorage
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});
