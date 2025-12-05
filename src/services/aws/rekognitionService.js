/**
 * Amazon Rekognition Service
 * AI-powered image analysis, OCR, face detection
 */

import { RekognitionClient, DetectTextCommand, DetectLabelsCommand, DetectFacesCommand } from "@aws-sdk/client-rekognition";

class RekognitionService {
  constructor() {
    this.client = null;
  }

  /**
   * Initialize Rekognition client
   */
  initClient(credentials, region = 'us-east-1') {
    this.client = new RekognitionClient({
      region: region,
      credentials: credentials
    });
  }

  /**
   * Scan receipt using OCR
   * Extracts text from receipt images
   */
  async scanReceipt(imageBytes) {
    try {
      if (!this.client) {
        throw new Error('Rekognition client not initialized');
      }

      const command = new DetectTextCommand({
        Image: { Bytes: imageBytes }
      });

      const response = await this.client.send(command);
      
      // Extract all text
      const textDetections = response.TextDetections || [];
      const lines = textDetections
        .filter(detection => detection.Type === 'LINE')
        .map(detection => ({
          text: detection.DetectedText,
          confidence: detection.Confidence
        }));

      // Parse receipt data
      const receiptData = this.parseReceiptData(lines);
      
      return {
        success: true,
        rawText: lines,
        parsedData: receiptData
      };
    } catch (error) {
      console.error('Error scanning receipt:', error);
      throw new Error(`Failed to scan receipt: ${error.message}`);
    }
  }

  /**
   * Parse receipt data from OCR text
   */
  parseReceiptData(lines) {
    const items = [];
    let total = null;
    let storeName = null;
    let date = null;

    // Extract store name (usually first line)
    if (lines.length > 0) {
      storeName = lines[0].text;
    }

    // Find items and prices
    lines.forEach((line, index) => {
      const text = line.text;
      
      // Look for prices (e.g., $12.99, 12.99)
      const priceMatch = text.match(/\$?(\d+\.\d{2})/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        
        // Check if this is the total
        if (text.toLowerCase().includes('total')) {
          total = price;
        } else {
          // It's likely an item
          items.push({
            name: text.replace(/\$?(\d+\.\d{2})/, '').trim(),
            price: price
          });
        }
      }

      // Look for date
      const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateMatch) {
        date = dateMatch[1];
      }
    });

    return {
      storeName,
      date,
      items,
      total: total || items.reduce((sum, item) => sum + item.price, 0),
      itemCount: items.length
    };
  }

  /**
   * Detect labels in image (objects, scenes, activities)
   */
  async detectLabels(imageBytes) {
    try {
      if (!this.client) {
        throw new Error('Rekognition client not initialized');
      }

      const command = new DetectLabelsCommand({
        Image: { Bytes: imageBytes },
        MaxLabels: 10,
        MinConfidence: 70
      });

      const response = await this.client.send(command);
      
      return {
        success: true,
        labels: response.Labels.map(label => ({
          name: label.Name,
          confidence: label.Confidence
        }))
      };
    } catch (error) {
      console.error('Error detecting labels:', error);
      throw new Error(`Failed to detect labels: ${error.message}`);
    }
  }

  /**
   * Detect faces in image
   */
  async detectFaces(imageBytes) {
    try {
      if (!this.client) {
        throw new Error('Rekognition client not initialized');
      }

      const command = new DetectFacesCommand({
        Image: { Bytes: imageBytes },
        Attributes: ['ALL']
      });

      const response = await this.client.send(command);
      
      return {
        success: true,
        faceCount: response.FaceDetails.length,
        faces: response.FaceDetails.map(face => ({
          ageRange: face.AgeRange,
          gender: face.Gender?.Value,
          emotions: face.Emotions?.map(e => ({ type: e.Type, confidence: e.Confidence })),
          smile: face.Smile?.Value
        }))
      };
    } catch (error) {
      console.error('Error detecting faces:', error);
      throw new Error(`Failed to detect faces: ${error.message}`);
    }
  }

  /**
   * Scan document (general text extraction)
   */
  async scanDocument(imageBytes) {
    try {
      if (!this.client) {
        throw new Error('Rekognition client not initialized');
      }

      const command = new DetectTextCommand({
        Image: { Bytes: imageBytes }
      });

      const response = await this.client.send(command);
      
      const textDetections = response.TextDetections || [];
      const fullText = textDetections
        .filter(detection => detection.Type === 'LINE')
        .map(detection => detection.DetectedText)
        .join('\n');

      return {
        success: true,
        text: fullText,
        detections: textDetections.length
      };
    } catch (error) {
      console.error('Error scanning document:', error);
      throw new Error(`Failed to scan document: ${error.message}`);
    }
  }
}

export default new RekognitionService();


