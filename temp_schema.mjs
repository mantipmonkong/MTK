import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://wjwavcqrahzopfuwcsrj.supabase.co', 'sb_publishable_6KEQXaBcMntb1zxhIoxJQQ_SR63CsFs');

async function test() {
  const { data, error } = await supabase.from('projects').select('*').limit(1);
  console.log(data, error);
}
test();
