import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { getFileUri, getBookFileUri } from '@/lib/filesystem';

interface ShareFile {
  path: string;
  title: string;
  type: 'paper' | 'book';
}

class FileShareService {
  /**
   * Check if native sharing is available on the current platform
   */
  async canShare(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'web') {
      // Check if Web Share API is available
      return 'share' in navigator;
    }

    try {
      const result = await Share.canShare();
      return result.value;
    } catch (error) {
      console.error('Error checking share capability:', error);
      return false;
    }
  }

  /**
   * Share a single file (paper or book)
   */
  async shareFile(filePath: string, title: string, type: 'paper' | 'book' = 'paper'): Promise<void> {
    const isWeb = Capacitor.getPlatform() === 'web';
    
    if (isWeb) {
      throw new Error('File sharing is not available on web platform. Please use the mobile app.');
    }

    try {
      // Validate file exists and get URI
      const fileName = filePath.split('/').pop() || '';
      let fileUri: string;
      
      try {
        if (type === 'book') {
          fileUri = await getBookFileUri(fileName);
        } else {
          fileUri = await getFileUri(fileName);
        }
      } catch (error) {
        throw new Error('File not found. Please ensure the file is downloaded.');
      }

      // Check if sharing is available
      const canShareFiles = await this.canShare();
      if (!canShareFiles) {
        throw new Error('Sharing is not available on this device.');
      }

      // Share the file
      await Share.share({
        title: title,
        text: `${title} - Shared from ScoreTarget`,
        files: [fileUri],
        dialogTitle: 'Share File',
      });

      console.log('✅ File shared successfully:', { title, fileUri });
    } catch (error) {
      console.error('❌ File sharing failed:', error);
      
      if (error instanceof Error) {
        // Re-throw with user-friendly message
        if (error.message.includes('cancel')) {
          // User cancelled sharing - don't show error
          return;
        }
        throw error;
      }
      
      throw new Error('Failed to share file. Please try again.');
    }
  }

  /**
   * Share multiple files (papers and/or books)
   */
  async shareMultipleFiles(files: ShareFile[]): Promise<void> {
    const isWeb = Capacitor.getPlatform() === 'web';
    
    if (isWeb) {
      throw new Error('File sharing is not available on web platform. Please use the mobile app.');
    }

    if (files.length === 0) {
      throw new Error('No files selected for sharing.');
    }

    try {
      // Check if sharing is available
      const canShareFiles = await this.canShare();
      if (!canShareFiles) {
        throw new Error('Sharing is not available on this device.');
      }

      // Get file URIs for all files
      const fileUris: string[] = [];
      const validFiles: ShareFile[] = [];

      for (const file of files) {
        try {
          const fileName = file.path.split('/').pop() || '';
          let fileUri: string;
          
          if (file.type === 'book') {
            fileUri = await getBookFileUri(fileName);
          } else {
            fileUri = await getFileUri(fileName);
          }
          
          fileUris.push(fileUri);
          validFiles.push(file);
        } catch (error) {
          console.warn(`⚠️ Skipping file ${file.title}: not found`);
          // Continue with other files
        }
      }

      if (fileUris.length === 0) {
        throw new Error('No valid files found for sharing. Please ensure files are downloaded.');
      }

      // Create share text
      const shareText = validFiles.length === 1 
        ? `${validFiles[0].title} - Shared from ScoreTarget`
        : `${validFiles.length} files shared from ScoreTarget`;

      const shareTitle = validFiles.length === 1
        ? validFiles[0].title
        : `${validFiles.length} Files`;

      // Share the files
      await Share.share({
        title: shareTitle,
        text: shareText,
        files: fileUris,
        dialogTitle: 'Share Files',
      });

      console.log('✅ Multiple files shared successfully:', { 
        count: fileUris.length, 
        files: validFiles.map(f => f.title) 
      });
    } catch (error) {
      console.error('❌ Multiple file sharing failed:', error);
      
      if (error instanceof Error) {
        // Re-throw with user-friendly message
        if (error.message.includes('cancel')) {
          // User cancelled sharing - don't show error
          return;
        }
        throw error;
      }
      
      throw new Error('Failed to share files. Please try again.');
    }
  }

  /**
   * Share a paper file
   */
  async sharePaper(filePath: string, title: string): Promise<void> {
    return this.shareFile(filePath, title, 'paper');
  }

  /**
   * Share a book file
   */
  async shareBook(filePath: string, title: string): Promise<void> {
    return this.shareFile(filePath, title, 'book');
  }

  /**
   * Share multiple papers
   */
  async sharePapers(papers: Array<{ path: string; title: string }>): Promise<void> {
    const shareFiles: ShareFile[] = papers.map(p => ({
      path: p.path,
      title: p.title,
      type: 'paper'
    }));
    
    return this.shareMultipleFiles(shareFiles);
  }

  /**
   * Share multiple books
   */
  async shareBooks(books: Array<{ path: string; title: string }>): Promise<void> {
    const shareFiles: ShareFile[] = books.map(b => ({
      path: b.path,
      title: b.title,
      type: 'book'
    }));
    
    return this.shareMultipleFiles(shareFiles);
  }

  /**
   * Share mixed papers and books
   */
  async shareMixed(items: Array<{ path: string; title: string; type: 'paper' | 'book' }>): Promise<void> {
    const shareFiles: ShareFile[] = items.map(item => ({
      path: item.path,
      title: item.title,
      type: item.type
    }));
    
    return this.shareMultipleFiles(shareFiles);
  }

  /**
   * Get platform-specific sharing limitations
   */
  getPlatformLimitations(): {
    maxFiles: number;
    maxFileSize: number;
    supportedFormats: string[];
    webSupported: boolean;
  } {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      return {
        maxFiles: 0, // Web doesn't support file sharing
        maxFileSize: 0,
        supportedFormats: [],
        webSupported: false
      };
    }
    
    if (platform === 'ios') {
      return {
        maxFiles: 10, // iOS has practical limits
        maxFileSize: 100 * 1024 * 1024, // 100MB per file
        supportedFormats: ['pdf', 'jpg', 'png', 'txt'],
        webSupported: false
      };
    }
    
    // Android
    return {
      maxFiles: 20, // Android is more flexible
      maxFileSize: 200 * 1024 * 1024, // 200MB per file
      supportedFormats: ['pdf', 'jpg', 'png', 'txt', 'doc', 'docx'],
      webSupported: false
    };
  }

  /**
   * Validate files before sharing
   */
  async validateFilesForSharing(files: ShareFile[]): Promise<{
    valid: ShareFile[];
    invalid: Array<{ file: ShareFile; reason: string }>;
  }> {
    const limitations = this.getPlatformLimitations();
    const valid: ShareFile[] = [];
    const invalid: Array<{ file: ShareFile; reason: string }> = [];

    // Check platform support
    if (!limitations.webSupported && Capacitor.getPlatform() === 'web') {
      return {
        valid: [],
        invalid: files.map(file => ({
          file,
          reason: 'File sharing not supported on web platform'
        }))
      };
    }

    // Check file count limit
    if (files.length > limitations.maxFiles) {
      return {
        valid: [],
        invalid: files.map(file => ({
          file,
          reason: `Too many files. Maximum ${limitations.maxFiles} files allowed.`
        }))
      };
    }

    // Validate each file
    for (const file of files) {
      try {
        const fileName = file.path.split('/').pop() || '';
        
        // Check file existence
        if (file.type === 'book') {
          await getBookFileUri(fileName);
        } else {
          await getFileUri(fileName);
        }
        
        valid.push(file);
      } catch (error) {
        invalid.push({
          file,
          reason: 'File not found or not accessible'
        });
      }
    }

    return { valid, invalid };
  }
}

export const fileShareService = new FileShareService();