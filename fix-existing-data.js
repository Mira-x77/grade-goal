import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import fitz from 'pymupdf'; // Note: This script is Node.js, so I can't use fitz here easily unless I use a Node lib.
// Wait, I should use the Python script to generate the PNGs locally first, then use Node to upload them.

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LIBRARY_FOLDER = 'C:\\Users\\mira\\Desktop\\Organized_Library';

async function fixTitles() {
    console.log('🔧 Fixing BEPC titles...');
    const { data, error } = await supabase
        .from('exam_papers')
        .select('id, title')
        .like('title', '%BEPC/Baccalauréat%');

    if (error) {
        console.error('Error fetching titles:', error);
        return;
    }

    console.log(`Found ${data.length} records to fix.`);

    for (const record of data) {
        const newTitle = record.title.replace('BEPC/Baccalauréat', 'BEPC');
        const { error: updateError } = await supabase
            .from('exam_papers')
            .update({ title: newTitle })
            .eq('id', record.id);

        if (updateError) {
            console.error(`Failed to update ${record.id}:`, updateError.message);
        } else {
            console.log(`✅ Fixed: ${newTitle}`);
        }
    }
}

async function main() {
    await fixTitles();
    console.log('\n✨ Database titles fixed. Previews should be re-uploaded using the auto-upload script or manual fixes.');
    console.log('To fix previews for already uploaded files, please ensure the Python script has generated the .png files in the Organized_Library, then run the uploader again (note: it may create duplicates unless you handle existing records).');
}

main().catch(console.error);
