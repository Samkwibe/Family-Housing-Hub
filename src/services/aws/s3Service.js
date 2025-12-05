/**
 * AWS S3 Service
 * File storage for photos, documents, receipts
 */

import { uploadData, getUrl, remove, list } from 'aws-amplify/storage';

class S3Service {
  /**
   * Upload a file to S3
   * @param {File} file - The file to upload
   * @param {string} folder - Folder path (e.g., 'photos', 'documents', 'receipts')
   * @param {string} userId - User ID for organization
   * @returns {Promise<{key: string, url: string}>}
   */
  async uploadFile(file, folder, userId) {
    try {
      const timestamp = Date.now();
      const fileName = `${userId}/${folder}/${timestamp}-${file.name}`;
      
      // Upload to S3
      const result = await uploadData({
        key: fileName,
        data: file,
        options: {
          contentType: file.type,
          metadata: {
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
          }
        }
      }).result;

      // Get the URL
      const urlResult = await getUrl({ key: fileName });
      
      return {
        key: fileName,
        url: urlResult.url.toString(),
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(file, userId) {
    return this.uploadFile(file, 'profile-photos', userId);
  }

  /**
   * Upload document
   */
  async uploadDocument(file, userId) {
    return this.uploadFile(file, 'documents', userId);
  }

  /**
   * Upload receipt
   */
  async uploadReceipt(file, userId) {
    return this.uploadFile(file, 'receipts', userId);
  }

  /**
   * Upload family photo
   */
  async uploadFamilyPhoto(file, userId) {
    return this.uploadFile(file, 'family-photos', userId);
  }

  /**
   * Get file URL
   */
  async getFileUrl(key) {
    try {
      const result = await getUrl({ key });
      return result.url.toString();
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw new Error(`Failed to get file URL: ${error.message}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(key) {
    try {
      await remove({ key });
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder, userId) {
    try {
      const prefix = `${userId}/${folder}/`;
      const result = await list({ prefix });
      
      return result.items.map(item => ({
        key: item.key,
        size: item.size,
        lastModified: item.lastModified,
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Get all user files
   */
  async getUserFiles(userId) {
    try {
      const prefix = `${userId}/`;
      const result = await list({ prefix });
      
      return result.items;
    } catch (error) {
      console.error('Error getting user files:', error);
      throw new Error(`Failed to get user files: ${error.message}`);
    }
  }
}

export default new S3Service();


