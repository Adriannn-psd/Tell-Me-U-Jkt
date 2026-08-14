require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      *,
      author:user_id ( full_name, username, avatar_url, prodi ),
      likes:post_likes(id),
      comments:post_comments(id)
    `)
    .order("created_at", { ascending: false });

  if (error) console.error("Error:", error);
  console.log(JSON.stringify(posts, null, 2));
}
check();
