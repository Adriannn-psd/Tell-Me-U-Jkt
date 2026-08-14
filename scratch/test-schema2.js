require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: user } = await supabase.from("users").select("id").limit(1).single();
  const { data, error } = await supabase.from("notifications").insert({
    recipient_id: user.id,
    actor_id: user.id,
    type: "follow",
    reference_id: user.id
  });
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
