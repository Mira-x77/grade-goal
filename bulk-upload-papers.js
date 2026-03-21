/**
 * Bulk Upload Script for Exam Papers
 * 
 * This script uploads PDF files from a folder to Supabase
 * 
 * USAGE:
 * 1. Place your PDF files in a folder (e.g., ./exam-papers/)
 * 2. Name files following this pattern:
 *    Subject_ClassLevel_Series_Year_ExamType_Session.pdf
 *    Example: Mathematiques_Terminale_A_2023_Baccalaureat_1stSemester.pdf
 * 
 * 3. Run: node bulk-upload-papers.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Folder containing PDFs to upload
const PAPERS_FOLDER = './exam-papers';

// Valid options
const VALID_SUBJECTS = [
  'Mathématiques', 'Physique', 'Chimie', 'SVT', 'Français',
  'Anglais', 'Histoire', 'Géographie', 'Philosophie', 'Informatique'
];

const VALID_CLASS_LEVELS = [
  'Sixième', 'Cinquième', 'Quatrième', 'Troisième',
  'Seconde', 'Première', 'Terminale'
];

const VALID_SERIES = ['A', 'C', 'D', 'E'];
const VALID_EXAM_TYPES = ['Baccalauréat', 'Composition', 'Devoir', 'Interro'];
const VALID_SESSIONS = ['1st Semester', '2nd Semester', 'Annual'];

/**
 * Calculate file hash for content integrity
 */
function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Parse filename to extract metadata
 * Expected format: Subject_ClassLevel_Series_Year_ExamType_Session.pdf
 * Example: Mathematiques_Terminale_A_2023_Baccalaureat_1stSemester.pdf
 */
function parseFilename(filename) {
  const nameWithoutExt = filename.replace('.pdf', '');
  const parts = nameWithoutExt.split('_');

  if (parts.length < 5) {
    throw new Error(`Invalid filename format: ${filename}. Expected: Subject_ClassLevel_Year_ExamType_Session.pdf`);
  }

  let subject = parts[0];
  let classLevel = parts[1];
  let series = null;
  let year, examType, session;

  // Check if there's a series (for Première and Terminale)
  if ((classLevel === 'Première' || classLevel === 'Terminale') && VALID_SERIES.includes(parts[2])) {
    series = parts[2];
    year = parseInt(parts[3]);
    examType = parts[4];
    session = parts.slice(5).join('_');
  } else {
    year = parseInt(parts[2]);
    examType = parts[3];
    session = parts.slice(4).join('_');
  }

  // Combine class level with series if applicable
  const fullClassLevel = series ? `${classLevel} ${series}` : classLevel;

  return {
    subject,
    classLevel: fullClassLevel,
    year,
    examType,
    session,
    originalFilename: filename
  };
}

/**
 * Upload a single PDF file
 */
async function uploadPaper(filePath, metadata) {
  console.log(`\n📄 Processing: ${metadata.originalFilename}`);
  console.log(`   Subject: ${metadata.subject}`);
  console.log(`   Class: ${metadata.classLevel}`);
  console.log(`   Year: ${metadata.year}`);
  console.log(`   Type: ${metadata.examType}`);
  console.log(`   Session: ${metadata.session}`);

  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;
    const contentHash = calculateFileHash(fileBuffer);

    // Upload to Supabase Storage
    const fileName = `${Date.now()}_${metadata.originalFilename}`;
    console.log(`   ⬆️  Uploading to storage...`);

    const { error: uploadError } = await supabase.storage
      .from('exam-papers')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('exam-papers')
      .getPublicUrl(fileName);

    console.log(`   ✅ Uploaded to storage`);

    // Create database record
    console.log(`   💾 Creating database record...`);

    const title = `${metadata.examType} ${metadata.subject} ${metadata.classLevel} ${metadata.year}`;

    const { data, error: dbError } = await supabase
      .from('exam_papers')
      .insert({
        title,
        subject: metadata.subject,
        class_level: metadata.classLevel,
        year: metadata.year,
        exam_type: metadata.examType,
        session: metadata.session,
        file_url: publicUrl,
        file_name: metadata.originalFilename,
        file_size: fileSize,
        file_size_formatted: formatBytes(fileSize),
        content_hash: contentHash,
        preview_url: null, // Preview generation would require pdf-lib
        tags: [],
        description: null,
        downloads: 0
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`   ✅ Database record created (ID: ${data.id})`);
    console.log(`   🎉 Successfully uploaded!`);

    return { success: true, data };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Bulk Upload Script for Exam Papers\n');
  console.log(`📁 Scanning folder: ${PAPERS_FOLDER}\n`);

  // Check if folder exists
  if (!fs.existsSync(PAPERS_FOLDER)) {
    console.error(`❌ Folder not found: ${PAPERS_FOLDER}`);
    console.log(`\nPlease create the folder and add your PDF files.`);
    process.exit(1);
  }

  // Get all PDF files
  const files = fs.readdirSync(PAPERS_FOLDER)
    .filter(file => file.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.log('❌ No PDF files found in the folder.');
    process.exit(1);
  }

  console.log(`Found ${files.length} PDF file(s)\n`);
  console.log('─'.repeat(60));

  const results = {
    total: files.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // Process each file
  for (const file of files) {
    try {
      const filePath = path.join(PAPERS_FOLDER, file);
      const metadata = parseFilename(file);
      const result = await uploadPaper(filePath, metadata);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ file, error: result.error });
      }

    } catch (error) {
      console.error(`\n❌ Error processing ${file}: ${error.message}`);
      results.failed++;
      results.errors.push({ file, error: error.message });
    }

    console.log('─'.repeat(60));
  }

  // Summary
  console.log('\n📊 Upload Summary:');
  console.log(`   Total files: ${results.total}`);
  console.log(`   ✅ Successful: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Failed uploads:');
    results.errors.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`);
    });
  }

  console.log('\n✨ Done!');
}

// Run the script
main().catch(console.error);
