import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("Checking users...");
  const { data: users, error: userErr } = await supabase.from('users').select('id, username').limit(5);
  console.log(users, userErr);
  
  console.log("\nChecking notifications...");
  const { data: notifs, error: notifErr } = await supabase.from('notifications').select('*').limit(5);
  console.log(notifs, notifErr);
}
check();
