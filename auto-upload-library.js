import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase URL or Anon Key");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LIBRARY_FOLDER = 'C:\\Users\\mira\\Desktop\\Organized_Library';

function calculateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function parseTXTMetadata(txtPath) {
    if (!fs.existsSync(txtPath)) return null;

    const lines = fs.readFileSync(txtPath, 'utf-8').split('\n');
    let metadata = {};

    for (const line of lines) {
        if (line.startsWith('Original File Name:')) metadata.originalName = line.replace('Original File Name:', '').trim();
        if (line.startsWith('Is BEPC Exam:')) metadata.isBepc = line.replace('Is BEPC Exam:', '').trim() === 'Yes';
        if (line.startsWith('Year:')) metadata.year = line.replace('Year:', '').trim();
        if (line.startsWith('Class:')) metadata.classLevel = line.replace('Class:', '').trim();
        if (line.startsWith('Semester:')) metadata.semester = line.replace('Semester:', '').trim();
        if (line.startsWith('Subject:')) metadata.subject = line.replace('Subject:', '').trim();
        if (line.startsWith('Focus Topics:')) metadata.focusTopics = line.replace('Focus Topics:', '').trim();
    }
    return metadata;
}

// Maps our heuristic output into valid Admin panel fields
function translateMetadataForDB(meta) {
    // Subject mappings based on Admin panel dropdown (VALID_SUBJECTS)
    let dbSubject = "Mathématiques";
    if (meta.subject === "SVT") dbSubject = "SVT";
    if (meta.subject === "PCT") dbSubject = "Physique";
    if (meta.subject === "FRENCH") dbSubject = "Français";
    if (meta.subject === "ENGLISH") dbSubject = "Anglais";
    if (meta.subject === "HG") dbSubject = "Histoire"; // Or Geographie
    if (meta.subject === "ECM") dbSubject = "Philosophie"; // Fallback for things not listed

    // Class level mappings
    let dbClass = "Troisième";
    // Basic fallback mappings, assuming mostly middle/high school files from the heuristic
    if (meta.classLevel.includes("6E") || meta.classLevel.includes("SIX") || meta.classLevel.includes("Unknown")) dbClass = "Sixième";
    if (meta.classLevel.includes("5E") || meta.classLevel.includes("CINQ")) dbClass = "Cinquième";
    if (meta.classLevel.includes("4E") || meta.classLevel.includes("QUAT")) dbClass = "Quatrième";
    if (meta.classLevel.includes("3E") || meta.classLevel.includes("TROIS")) dbClass = "Troisième";
    if (meta.classLevel.includes("2ND") || meta.classLevel.includes("SECOND")) dbClass = "Seconde";
    if (meta.classLevel.includes("1ER") || meta.classLevel.includes("PREMIER")) dbClass = "Première";
    if (meta.classLevel.includes("TERM") || meta.classLevel.includes("BAC")) dbClass = "Terminale";

    // Year
    let dbYear = parseInt(meta.year);
    if (isNaN(dbYear)) dbYear = new Date().getFullYear();

    // Exam Type Mapping (Admin panel: 'Baccalauréat', 'Composition', 'Devoir', 'Interro')
    let dbType = meta.isBepc ? "Baccalauréat" : "Devoir";

    // Session Mapping (Admin panel: '1st Semester', '2nd Semester', 'Annual')
    let dbSession = "Annual";
    if (meta.semester?.includes("1") || meta.semester?.includes("Trimestre 1")) dbSession = "1st Semester";
    if (meta.semester?.includes("2") || meta.semester?.includes("Trimestre 2")) dbSession = "2nd Semester";

    // Auto Generate Title
    let dbTitle = `${meta.isBepc ? "BEPC" : "Devoir"} ${dbSubject} ${dbClass} ${dbYear}`;

    // Tags
    let dbTags = meta.focusTopics !== "General Topic" ? [meta.focusTopics] : [];

    return {
        title: dbTitle,
        subject: dbSubject,
        class_level: dbClass,
        year: dbYear,
        exam_type: dbType,
        session: dbSession,
        tags: dbTags,
        original_name: meta.originalName || "Unknown.pdf"
    };
}

async function uploadPaper(pdfPath, txtPath) {
    const rawMeta = parseTXTMetadata(txtPath);
    if (!rawMeta) {
        console.log(`❌ Skipped ${pdfPath} (Missing metadata .txt file)`);
        return false;
    }

    const dbMeta = translateMetadataForDB(rawMeta);

    console.log(`\n📄 Processing: ${dbMeta.original_name}`);
    console.log(`   Title:   ${dbMeta.title}`);
    console.log(`   Subject: ${dbMeta.subject}`);
    console.log(`   Class:   ${dbMeta.class_level}`);
    console.log(`   Year:    ${dbMeta.year}`);
    console.log(`   Type:    ${dbMeta.exam_type}`);

    try {
        const fileBuffer = fs.readFileSync(pdfPath);
        const fileSize = fileBuffer.length;
        const contentHash = calculateFileHash(fileBuffer);

        const fileName = `${Date.now()}_${path.basename(pdfPath)}`;
        console.log(`   ⬆️  Uploading to storage...`);

        const { error: uploadError } = await supabase.storage
            .from('exam-papers')
            .upload(fileName, fileBuffer, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
            .from('exam-papers')
            .getPublicUrl(fileName);

        console.log(`   ✅ Uploaded to storage: ${publicUrl}`);

        // Handle Preview Image if exists
        let previewUrl = null;
        const pngPath = pdfPath.substring(0, pdfPath.length - 4) + ".png";
        if (fs.existsSync(pngPath)) {
            console.log(`   ⬆️  Uploading preview...`);
            const pngBuffer = fs.readFileSync(pngPath);
            const pngFileName = `preview_${Date.now()}_${path.basename(pngPath)}`;

            const { error: pngError } = await supabase.storage
                .from('exam-papers')
                .upload(pngFileName, pngBuffer, {
                    contentType: 'image/png',
                    upsert: false
                });

            if (!pngError) {
                const { data: { publicUrl: pUrl } } = supabase.storage
                    .from('exam-papers')
                    .getPublicUrl(pngFileName);
                previewUrl = pUrl;
                console.log(`   ✅ Preview uploaded: ${previewUrl}`);
            } else {
                console.error(`   ⚠️ Preview upload failed: ${pngError.message}`);
            }
        }

        console.log(`   💾 Upserting database record...`);

        // Find if record already exists for this file_name in this year
        const { data: existing, error: findError } = await supabase
            .from('exam_papers')
            .select('id')
            .eq('file_name', dbMeta.original_name)
            .eq('year', dbMeta.year)
            .maybeSingle();

        let dbResult;
        if (existing) {
            console.log(`   📝 Found existing record (ID: ${existing.id}), updating...`);
            dbResult = await supabase
                .from('exam_papers')
                .update({
                    title: dbMeta.title,
                    subject: dbMeta.subject,
                    class_level: dbMeta.class_level,
                    exam_type: dbMeta.exam_type,
                    session: dbMeta.session,
                    file_url: publicUrl,
                    file_size: fileSize,
                    file_size_formatted: formatBytes(fileSize),
                    content_hash: contentHash,
                    preview_url: previewUrl || undefined, // Update preview if we have one
                    tags: dbMeta.tags
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            dbResult = await supabase
                .from('exam_papers')
                .insert({
                    title: dbMeta.title,
                    subject: dbMeta.subject,
                    class_level: dbMeta.class_level,
                    year: dbMeta.year,
                    exam_type: dbMeta.exam_type,
                    session: dbMeta.session,
                    file_url: publicUrl,
                    file_name: dbMeta.original_name,
                    file_size: fileSize,
                    file_size_formatted: formatBytes(fileSize),
                    content_hash: contentHash,
                    preview_url: previewUrl,
                    tags: dbMeta.tags,
                    description: `Auto-uploaded from Organized_Library.\nFocus Topics: ${rawMeta.focusTopics}`,
                    downloads: 0
                })
                .select()
                .single();
        }

        const { data, error: dbError } = dbResult;
        if (dbError) throw new Error(`Database error: ${dbError.message}`);

        console.log(`   ✅ Database record processed (ID: ${data.id})`);
        return true;

    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 Automated Upload Script from Organized_Library\n');
    console.log(`📁 Scanning folder: ${LIBRARY_FOLDER}\n`);

    if (!fs.existsSync(LIBRARY_FOLDER)) {
        console.error(`❌ Folder not found: ${LIBRARY_FOLDER}`);
        process.exit(1);
    }

    // We want to walk the folder recursively and find all PDFs.
    let filesToProcess = [];

    function walkDir(dir) {
        const list = fs.readdirSync(dir);
        for (let file of list) {
            file = path.resolve(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                walkDir(file);
            } else {
                if (file.toLowerCase().endsWith('.pdf')) {
                    filesToProcess.push(file);
                }
            }
        }
    }

    walkDir(LIBRARY_FOLDER);
    console.log(`Found ${filesToProcess.length} PDF file(s)\n`);
    console.log('─'.repeat(60));

    let success = 0;
    let failed = 0;

    for (const pdfPath of filesToProcess) {
        // Find corresponding .txt file
        const txtPath = pdfPath.substring(0, pdfPath.length - 4) + ".txt";

        try {
            const isSuccess = await uploadPaper(pdfPath, txtPath);
            if (isSuccess) success++;
            else failed++;
        } catch (e) {
            console.error(`Unhandled error on ${pdfPath}: ${e}`);
            failed++;
        }
        console.log('─'.repeat(60));
    }

    console.log('\n📊 Upload Summary:');
    console.log(`   Total files: ${filesToProcess.length}`);
    console.log(`   ✅ Successful: ${success}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('\n✨ Done!');
}

main().catch(console.error);
