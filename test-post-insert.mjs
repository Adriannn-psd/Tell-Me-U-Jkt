import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('posts').insert({
    user_id: '123456789',
    title: 'test',
    description: 'desc',
    media_url: 'http://test.com'
  }).select();
  
  console.log('Data:', data);
  console.log('Error:', error);
}

run();
