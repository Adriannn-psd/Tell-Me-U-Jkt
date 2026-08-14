require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: user, error: err1 } = await supabase.from('users').select('*').eq('id', '1458f878-67b8-43ac-8e97-7203db474903').single();
  console.log('User in users table:', user);
  
  const { data: profile, error: err2 } = await supabase.from('profiles').select('*').eq('id', '1458f878-67b8-43ac-8e97-7203db474903').single();
  console.log('User in profiles table:', profile);
  
  if (!profile && user) {
    console.log('Inserting into profiles...');
    const { data: inserted, error: err3 } = await supabase.from('profiles').insert({
      id: user.id,
      updated_at: new Date().toISOString(),
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      username: user.username,
      prodi: user.prodi
    }).select();
    console.log('Inserted profile:', inserted, err3);
  }
}
check();
