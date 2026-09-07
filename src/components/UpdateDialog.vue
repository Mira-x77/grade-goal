<template>
  <ion-modal :is-open="isOpen" @did-dismiss="onDismiss" :can-dismiss="!update?.isMandatory">
    <ion-header>
      <ion-toolbar>
        <ion-title>App Update Available</ion-title>
        <ion-buttons slot="end" v-if="!update?.isMandatory">
          <ion-button @click="onDismiss">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="update-content">
      <div class="update-header">
        <div class="version-info">
          <h2>Version {{ update?.versionName }}</h2>
          <div class="update-badges">
            <ion-chip v-if="update?.isMandatory" color="danger">
              <ion-icon :icon="alertCircleOutline"></ion-icon>
              <ion-label>Required Update</ion-label>
            </ion-chip>
            <ion-chip color="primary">
              <ion-icon :icon="downloadOutline"></ion-icon>
              <ion-label>{{ formatFileSize(update?.fileSize || 0) }}</ion-label>
            </ion-chip>
          </div>
        </div>
      </div>

      <div class="update-sections">
        <!-- Release Notes -->
        <div class="update-section" v-if="update?.releaseNotes">
          <h3>
            <ion-icon :icon="documentTextOutline"></ion-icon>
            What's New
          </h3>
          <p class="section-content">{{ update.releaseNotes }}</p>
        </div>

        <!-- Bug Fixes -->
        <div class="update-section" v-if="update?.bugFixes">
          <h3>
            <ion-icon :icon="bugOutline"></ion-icon>
            Bug Fixes
          </h3>
          <p class="section-content">{{ update.bugFixes }}</p>
        </div>

        <!-- New Features -->
        <div class="update-section" v-if="update?.newFeatures">
          <h3>
            <ion-icon :icon="sparklesOutline"></ion-icon>
            New Features
          </h3>
          <p class="section-content">{{ update.newFeatures }}</p>
        </div>
      </div>

      <!-- Download Progress -->
      <div v-if="isDownloading" class="download-progress">
        <div class="progress-header">
          <h4>Downloading Update...</h4>
          <span class="progress-text">{{ downloadProgress }}%</span>
        </div>
        <ion-progress-bar :value="downloadProgress / 100"></ion-progress-bar>
        <p class="progress-info">
          Please don't close the app while downloading
        </p>
      </div>

      <!-- Error Message -->
      <ion-item v-if="errorMessage" color="danger" class="error-item">
        <ion-icon :icon="alertCircleOutline" slot="start"></ion-icon>
        <ion-label>
          <h3>Download Failed</h3>
          <p>{{ errorMessage }}</p>
        </ion-label>
      </ion-item>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <div class="update-actions">
          <ion-button 
            v-if="!update?.isMandatory && !isDownloading" 
            fill="clear" 
            @click="onDismiss"
          >
            Later
          </ion-button>
          
          <ion-button 
            v-if="!isDownloading && !errorMessage"
            expand="block" 
            @click="startUpdate"
            :disabled="isDownloading"
          >
            <ion-icon :icon="downloadOutline" slot="start"></ion-icon>
            {{ update?.isMandatory ? 'Update Now' : 'Download & Install' }}
          </ion-button>

          <ion-button 
            v-if="errorMessage"
            expand="block" 
            @click="retryUpdate"
          >
            <ion-icon :icon="refreshOutline" slot="start"></ion-icon>
            Retry Download
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonChip,
  IonLabel,
  IonProgressBar,
  IonItem,
  alertController
} from '@ionic/vue';
import {
  closeOutline,
  downloadOutline,
  alertCircleOutline,
  documentTextOutline,
  bugOutline,
  sparklesOutline,
  refreshOutline
} from 'ionicons/icons';
import { updateService, type AppUpdate } from '@/services/UpdateService';

interface Props {
  isOpen: boolean;
  update: AppUpdate | null;
}

interface Emits {
  (e: 'dismiss'): void;
  (e: 'updateStarted'): void;
  (e: 'updateCompleted'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isDownloading = ref(false);
const downloadProgress = ref(0);
const errorMessage = ref('');

const formatFileSize = (bytes: number): string => {
  return updateService.formatFileSize(bytes);
};

const onDismiss = () => {
  if (!props.update?.isMandatory && !isDownloading.value) {
    emit('dismiss');
  }
};

const startUpdate = async () => {
  if (!props.update) return;

  try {
    isDownloading.value = true;
    downloadProgress.value = 0;
    errorMessage.value = '';
    
    emit('updateStarted');

    const success = await updateService.downloadAndInstallUpdate(
      props.update,
      (progress) => {
        downloadProgress.value = progress;
      }
    );

    if (success) {
      // Show success message
      const alert = await alertController.create({
        header: 'Update Ready',
        message: 'The update has been downloaded. The app will now restart to complete the installation.',
        buttons: ['OK']
      });
      
      await alert.present();
      emit('updateCompleted');
    } else {
      throw new Error('Update installation failed');
    }
  } catch (error) {
    console.error('Update failed:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Update failed. Please try again.';
  } finally {
    isDownloading.value = false;
  }
};

const retryUpdate = () => {
  errorMessage.value = '';
  startUpdate();
};
</script>

<style scoped>
.update-content {
  --padding-start: 20px;
  --padding-end: 20px;
}

.update-header {
  padding: 20px 0;
  text-align: center;
  border-bottom: 1px solid var(--ion-color-light);
}

.version-info h2 {
  margin: 0 0 10px 0;
  color: var(--ion-color-primary);
}

.update-badges {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.update-sections {
  padding: 20px 0;
}

.update-section {
  margin-bottom: 24px;
}

.update-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  color: var(--ion-color-dark);
  font-size: 16px;
  font-weight: 600;
}

.section-content {
  margin: 0;
  line-height: 1.5;
  color: var(--ion-color-medium-shade);
  white-space: pre-line;
}

.download-progress {
  padding: 20px;
  background: var(--ion-color-light);
  border-radius: 8px;
  margin: 20px 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-header h4 {
  margin: 0;
  color: var(--ion-color-primary);
}

.progress-text {
  font-weight: 600;
  color: var(--ion-color-primary);
}

.progress-info {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: var(--ion-color-medium);
  text-align: center;
}

.error-item {
  margin: 16px 0;
  border-radius: 8px;
}

.update-actions {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  width: 100%;
}

.update-actions ion-button {
  flex: 1;
}

.update-actions ion-button[fill="clear"] {
  flex: 0 0 auto;
}
</style>