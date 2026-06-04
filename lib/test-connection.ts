import { supabase } from './supabase';

/**
 * Test function to verify Supabase connection and query the brands table.
 * You can execute this function to test if your credentials are correct.
 */
export async function testBrandsQuery() {
  console.log('Testing Supabase connection by querying the brands table...');
  
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error connecting to Supabase or fetching brands:', error.message);
    return { success: false, error };
  }

  console.log('Connection successful! Fetched brands:', data);
  return { success: true, data };
}
