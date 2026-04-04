const CONFIG = {
    SUPABASE_URL: 'https://xwkmhpcombsauoozyidi.supabase.co',
    SUPABASE_KEY: 'sb_publishable_5iDJi-xK69y1DM0nFYjqlw_TaozemSt',
    RESTAURANT_ID: '5b1b7ba9-eb12-4848-80f2-597149d52f3e'
};

const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
