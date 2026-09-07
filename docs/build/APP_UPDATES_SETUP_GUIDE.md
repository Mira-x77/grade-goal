# In-App Updates Setup Guide

This guide will help you set up the complete in-app update system for your mobile app.

## 🗄️ Database Setup

### 1. Run the PostgreSQL Schema

Execute the SQL from `exam-library-admin/setup-app-updates.sql`:

```sql
-- App Updates Table (PostgreSQL version)
CREATE TABLE app_updates (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(50) NOT NULL,
    version_code INTEGER NOT NULL,
    apk_file_path VARCHAR(255) NOT NULL,
    apk_file_size BIGINT NOT NULL,
    release_notes TEXT NOT NULL,
    bug_fixes TEXT,
    new_features TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    min_supported_version INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes and trigger (see full file for complete setup)
```

### 2. Set up Supabase Storage

Run the SQL from `supabase/setup-app-updates-storage.sql`:

```sql
-- Create storage bucket for app updates
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-updates', 'app-updates', true);

-- Set up RLS policies (see full file)
```

## 📱 Mobile App Setup

### 1. Update Version Code

In `src/services/UpdateService.ts`, update the current version:

```typescript
private readonly CURRENT_VERSION_CODE = 1; // Change this to your app's current version
```

### 2. Add Update Check to App.vue

The update check is already integrated in `src/App.vue` and will automatically check for updates when the app starts.

### 3. Build Android Plugin

The custom Android plugin is already created. Build your app:

```bash
npm run build
npx cap sync android
npx cap open android
```

## 🔧 Admin Panel Setup

### 1. Access App Updates

Navigate to the "App Updates" section in your admin panel at:
`http://localhost:5173/app-updates` (or your admin URL)

### 2. Upload Your First Update

1. Click "Upload New Update"
2. Fill in version information:
   - **Version Name**: Human-readable (e.g., "1.2.3")
   - **Version Code**: Numeric for comparison (e.g., 123)
3. Select your APK file
4. Add release notes, bug fixes, and new features
5. Choose if it's mandatory
6. Upload!

## 🚀 How It Works

### For Users:
1. **App Launch**: Automatic update check
2. **Update Available**: Beautiful dialog shows changelog
3. **User Choice**: Download & install or skip (unless mandatory)
4. **Download**: Progress indicator during APK download
5. **Install**: Automatic APK installation prompt

### For Admins:
1. **Upload**: Easy APK upload with metadata
2. **Manage**: Activate/deactivate updates
3. **Monitor**: View download stats and user feedback
4. **Control**: Mark updates as mandatory when needed

## 📋 Testing Checklist

### Admin Panel Testing:
- [ ] Upload a test APK
- [ ] View update in the list
- [ ] Toggle update active/inactive
- [ ] Download APK from admin panel
- [ ] Delete test update

### Mobile App Testing:
- [ ] App checks for updates on startup
- [ ] Update dialog appears with correct information
- [ ] Download progress works
- [ ] APK installation prompt appears
- [ ] App updates successfully

## 🔒 Security Considerations

### APK Signing:
- Always sign APKs with the same certificate
- Use release keystore for production updates

### Permissions:
- `REQUEST_INSTALL_PACKAGES` - Required for APK installation
- Users must enable "Unknown Sources" for your app

### Storage:
- Supabase storage bucket is public for downloads
- Admin authentication required for uploads

## 🛠️ Customization Options

### Update Dialog:
- Modify `src/components/UpdateDialog.vue` for custom styling
- Add your app branding and colors

### Update Logic:
- Change mandatory update behavior in `UpdateService.ts`
- Add custom validation rules

### Admin Interface:
- Customize `exam-library-admin/src/pages/AppUpdates.tsx`
- Add additional metadata fields

## 📊 Monitoring & Analytics

### Track Update Success:
- Monitor download completion rates
- Track installation success/failure
- User feedback on updates

### Version Analytics:
- See which versions users are running
- Identify update adoption rates
- Plan deprecation timelines

## 🚨 Troubleshooting

### Common Issues:

**"APK not installing"**
- Check if APK is signed with same certificate
- Verify user has enabled unknown sources
- Ensure sufficient storage space

**"Update not appearing"**
- Check version code is higher than current
- Verify update is marked as active
- Check minimum supported version

**"Download failing"**
- Verify Supabase storage permissions
- Check internet connection
- Ensure APK file exists in storage

### Debug Steps:
1. Check browser console for errors
2. Verify database table exists
3. Test Supabase storage access
4. Check Android logcat for native errors

## 🔄 Update Workflow

### Development:
1. Build new APK with incremented version code
2. Test APK installation manually
3. Upload to admin panel with detailed changelog
4. Test update flow on development devices

### Production:
1. Upload APK to admin panel
2. Mark as inactive initially
3. Test with small user group
4. Activate for all users
5. Monitor adoption and issues

## 📝 Version Management

### Version Naming:
- Use semantic versioning (1.2.3)
- Increment version code for each build
- Document breaking changes clearly

### Rollback Strategy:
- Keep previous versions available
- Plan rollback procedure for critical issues
- Test rollback process regularly

---

## 🎉 You're Ready!

Your in-app update system is now fully configured. Users will automatically receive update notifications with beautiful changelogs, and you have full control over the update process through your admin panel.

**Next Steps:**
1. Test the complete flow
2. Upload your first production update
3. Monitor user adoption
4. Gather feedback and iterate

Happy updating! 🚀