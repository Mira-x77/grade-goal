
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
    console.log('Testing Supabase connection...');
    try {
        const { data, error } = await supabase
            .from('exam_papers')
            .select('*');

        if (error) {
            console.error('Error fetching papers:', error);
            return;
        }

        console.log('Success! Fetched papers:', data.length);
        console.log('Data sample:', JSON.stringify(data[0], null, 2));
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testSupabase();
