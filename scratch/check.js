require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  console.log('Profiles table:', error ? error.message : 'Exists');
  
  const { data: cols, error: err2 } = await supabase.from('posts').select('*').limit(1);
  console.log('Posts table columns:', cols && cols.length > 0 ? Object.keys(cols[0]) : (cols ? 'empty' : err2.message));
}
check();
