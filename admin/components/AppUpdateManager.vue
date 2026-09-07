<template>
  <div class="app-update-manager">
    <div class="header">
      <h2>App Update Management</h2>
      <button @click="showUploadForm = true" class="btn-primary">
        Upload New Update
      </button>
    </div>

    <!-- Upload Form Modal -->
    <div v-if="showUploadForm" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>Upload New App Update</h3>
          <button @click="closeUploadForm" class="close-btn">&times;</button>
        </div>
        
        <form @submit.prevent="uploadUpdate" class="upload-form">
          <div class="form-group">
            <label>Version Name</label>
            <input 
              v-model="updateForm.versionName" 
              type="text" 
              placeholder="e.g., 1.2.3"
              required
            />
          </div>

          <div class="form-group">
            <label>Version Code</label>
            <input 
              v-model.number="updateForm.versionCode" 
              type="number" 
              placeholder="e.g., 123"
              required
            />
          </div>

          <div class="form-group">
            <label>APK File</label>
            <input 
              @change="handleFileSelect" 
              type="file" 
              accept=".apk"
              required
            />
            <div v-if="selectedFile" class="file-info">
              Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
            </div>
          </div>

          <div class="form-group">
            <label>Release Notes</label>
            <textarea 
              v-model="updateForm.releaseNotes" 
              placeholder="What's new in this version..."
              rows="4"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label>Bug Fixes</label>
            <textarea 
              v-model="updateForm.bugFixes" 
              placeholder="List of bugs fixed..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>New Features</label>
            <textarea 
              v-model="updateForm.newFeatures" 
              placeholder="New features added..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="updateForm.isMandatory" 
                type="checkbox"
              />
              Mandatory Update (users must update)
            </label>
          </div>

          <div class="form-group">
            <label>Minimum Supported Version Code</label>
            <input 
              v-model.number="updateForm.minSupportedVersion" 
              type="number" 
              placeholder="Minimum version that can update to this"
            />
          </div>

          <div class="form-actions">
            <button type="button" @click="closeUploadForm" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="uploading" class="btn-primary">
              {{ uploading ? 'Uploading...' : 'Upload Update' }}
            </button>
          </div>
        </form>

        <div v-if="uploading" class="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <p>{{ uploadProgress }}% uploaded</p>
        </div>
      </div>
    </div>

    <!-- Updates List -->
    <div class="updates-list">
      <h3>Recent Updates</h3>
      <div v-if="updates.length === 0" class="no-updates">
        No updates uploaded yet.
      </div>
      
      <div v-for="update in updates" :key="update.id" class="update-card">
        <div class="update-header">
          <h4>Version {{ update.version_name }}</h4>
          <div class="update-meta">
            <span class="version-code">Code: {{ update.version_code }}</span>
            <span :class="['status', update.is_active ? 'active' : 'inactive']">
              {{ update.is_active ? 'Active' : 'Inactive' }}
            </span>
            <span v-if="update.is_mandatory" class="mandatory">Mandatory</span>
          </div>
        </div>
        
        <div class="update-content">
          <div class="release-notes">
            <strong>Release Notes:</strong>
            <p>{{ update.release_notes }}</p>
          </div>
          
          <div v-if="update.bug_fixes" class="bug-fixes">
            <strong>Bug Fixes:</strong>
            <p>{{ update.bug_fixes }}</p>
          </div>
          
          <div v-if="update.new_features" class="new-features">
            <strong>New Features:</strong>
            <p>{{ update.new_features }}</p>
          </div>
        </div>
        
        <div class="update-actions">
          <button @click="toggleUpdateStatus(update)" class="btn-secondary">
            {{ update.is_active ? 'Deactivate' : 'Activate' }}
          </button>
          <button @click="deleteUpdate(update)" class="btn-danger">
            Delete
          </button>
          <a :href="getDownloadUrl(update)" class="btn-secondary" download>
            Download APK
          </a>
        </div>
        
        <div class="update-stats">
          <small>
            Uploaded: {{ formatDate(update.created_at) }} | 
            Size: {{ formatFileSize(update.apk_file_size) }}
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppUpdateManager',
  data() {
    return {
      showUploadForm: false,
      uploading: false,
      uploadProgress: 0,
      selectedFile: null,
      updates: [],
      updateForm: {
        versionName: '',
        versionCode: null,
        releaseNotes: '',
        bugFixes: '',
        newFeatures: '',
        isMandatory: false,
        minSupportedVersion: null
      }
    }
  },
  
  mounted() {
    this.loadUpdates();
  },
  
  methods: {
    async loadUpdates() {
      try {
        const response = await fetch('/api/admin/app-updates');
        this.updates = await response.json();
      } catch (error) {
        console.error('Failed to load updates:', error);
      }
    },
    
    handleFileSelect(event) {
      this.selectedFile = event.target.files[0];
    },
    
    async uploadUpdate() {
      if (!this.selectedFile) return;
      
      this.uploading = true;
      this.uploadProgress = 0;
      
      const formData = new FormData();
      formData.append('apk', this.selectedFile);
      formData.append('versionName', this.updateForm.versionName);
      formData.append('versionCode', this.updateForm.versionCode);
      formData.append('releaseNotes', this.updateForm.releaseNotes);
      formData.append('bugFixes', this.updateForm.bugFixes);
      formData.append('newFeatures', this.updateForm.newFeatures);
      formData.append('isMandatory', this.updateForm.isMandatory);
      formData.append('minSupportedVersion', this.updateForm.minSupportedVersion);
      
      try {
        const response = await fetch('/api/admin/app-updates', {
          method: 'POST',
          body: formData,
          onUploadProgress: (progressEvent) => {
            this.uploadProgress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
          }
        });
        
        if (response.ok) {
          this.closeUploadForm();
          this.loadUpdates();
          alert('Update uploaded successfully!');
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload update');
      } finally {
        this.uploading = false;
      }
    },
    
    closeUploadForm() {
      this.showUploadForm = false;
      this.selectedFile = null;
      this.updateForm = {
        versionName: '',
        versionCode: null,
        releaseNotes: '',
        bugFixes: '',
        newFeatures: '',
        isMandatory: false,
        minSupportedVersion: null
      };
    },
    
    async toggleUpdateStatus(update) {
      try {
        const response = await fetch(`/api/admin/app-updates/${update.id}/toggle`, {
          method: 'PATCH'
        });
        
        if (response.ok) {
          this.loadUpdates();
        }
      } catch (error) {
        console.error('Failed to toggle update status:', error);
      }
    },
    
    async deleteUpdate(update) {
      if (!confirm('Are you sure you want to delete this update?')) return;
      
      try {
        const response = await fetch(`/api/admin/app-updates/${update.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          this.loadUpdates();
        }
      } catch (error) {
        console.error('Failed to delete update:', error);
      }
    },
    
    getDownloadUrl(update) {
      return `/api/admin/app-updates/${update.id}/download`;
    },
    
    formatFileSize(bytes) {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString();
    }
  }
}
</script>

<style scoped>
.app-update-manager {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 20px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-info {
  margin-top: 5px;
  font-size: 14px;
  color: #666;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.upload-progress {
  margin-top: 20px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.update-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.update-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.status.active {
  color: #28a745;
  font-weight: 600;
}

.status.inactive {
  color: #dc3545;
  font-weight: 600;
}

.mandatory {
  background: #ff6b6b;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.update-content {
  margin-bottom: 15px;
}

.update-content > div {
  margin-bottom: 10px;
}

.update-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.update-stats {
  color: #666;
  font-size: 12px;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.no-updates {
  text-align: center;
  color: #666;
  padding: 40px;
}
</style>