const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .update({ is_admin: true })
    .eq('telegram_id', 1638657267)
    .select();

  if (error) {
    console.error('Error updating user:', error);
  } else {
    console.log('Successfully updated user to admin:', data);
  }
}

run();
