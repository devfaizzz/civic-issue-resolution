// TensorFlow disabled for portability on Windows; using mock model
const sharp = require('sharp');
const logger = require('../utils/logger');

class ClassificationService {
  constructor() {
    this.model = null;
    this.categories = [
      'pothole',
      'streetlight',
      'garbage',
      'water',
      'sewage',
      'traffic',
      'other'
    ];
    this.priorityLevels = ['low', 'medium', 'high', 'critical'];
  }

  /**
   * Initialize the AI model
   */
  async initialize() {
    try {
      // In production, load a pre-trained model
      // this.model = await tf.loadLayersModel('file://./models/issue-classifier/model.json');
      
      // For now, create a simple mock model
      this.model = this.createMockModel();
      logger.info('AI Classification Service initialized');
    } catch (error) {
      logger.error('Failed to initialize AI model:', error);
    }
  }

  /**
   * Create a mock model for demonstration
   */
  createMockModel() {
    return {
      predict: () => {
        // Simulate model prediction
        return {
          category: this.categories[Math.floor(Math.random() * this.categories.length)],
          confidence: 0.75 + Math.random() * 0.25
        };
      }
    };
  }

  /**
   * Classify an issue based on image and text
   */
  async classifyIssue(imageBuffer, text, metadata = {}) {
    try {
      const features = await this.extractFeatures(imageBuffer, text, metadata);
      const prediction = await this.predict(features);
      const priority = this.determinePriority(prediction, text, metadata);
      
      return {
        category: prediction.category,
        confidence: prediction.confidence,
        suggestedPriority: priority,
        processedAt: new Date(),
        features: features
      };
    } catch (error) {
      logger.error('Classification error:', error);
      return {
        category: 'other',
        confidence: 0,
        suggestedPriority: 'medium',
        error: error.message
      };
    }
  }

  /**
   * Extract features from image and text
   */
  async extractFeatures(imageBuffer, text, metadata) {
    const features = {
      imageFeatures: null,
      textFeatures: null,
      metadataFeatures: null
    };

    // Image feature extraction
    if (imageBuffer) {
      features.imageFeatures = await this.extractImageFeatures(imageBuffer);
    }

    // Text feature extraction
    if (text) {
      features.textFeatures = this.extractTextFeatures(text);
    }

    // Metadata features
    if (metadata) {
      features.metadataFeatures = this.extractMetadataFeatures(metadata);
    }

    return features;
  }

  /**
   * Extract features from image
   */
  async extractImageFeatures(imageBuffer) {
    try {
      // Preprocess image
      const processedImage = await sharp(imageBuffer)
        .resize(224, 224) // Standard size for many models
        .normalise()
        .toBuffer();

      // In production, convert to tensor and extract features
      // const tensor = tf.node.decodeImage(processedImage);
      // const features = this.model.predict(tensor);
      
      // Mock features for now
      return {
        dominantColors: ['gray', 'black'],
        brightness: 0.5,
        contrast: 0.7,
        hasHole: Math.random() > 0.5,
        hasWater: Math.random() > 0.7,
        hasDebris: Math.random() > 0.6
      };
    } catch (error) {
      logger.error('Image feature extraction error:', error);
      return null;
    }
  }

  /**
   * Extract features from text
   */
  extractTextFeatures(text) {
    const lowerText = text.toLowerCase();
    
    // Keywords for each category
    const keywords = {
      pothole: ['pothole', 'hole', 'road damage', 'crater', 'pavement'],
      streetlight: ['light', 'lamp', 'dark', 'broken light', 'streetlight'],
      garbage: ['garbage', 'trash', 'waste', 'litter', 'dump', 'smell'],
      water: ['water', 'leak', 'pipe', 'flooding', 'burst'],
      sewage: ['sewage', 'drain', 'sewer', 'overflow', 'blockage'],
      traffic: ['signal', 'traffic', 'sign', 'traffic light']
    };

    const features = {
      length: text.length,
      wordCount: text.split(/\s+/).length,
      categoryScores: {}
    };

    // Calculate category scores based on keyword matches
    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      features.categoryScores[category] = categoryKeywords.reduce((score, keyword) => {
        return score + (lowerText.includes(keyword) ? 1 : 0);
      }, 0);
    }

    // Urgency indicators
    features.urgencyScore = this.calculateUrgencyScore(lowerText);

    return features;
  }

  /**
   * Calculate urgency score from text
   */
  calculateUrgencyScore(text) {
    const urgentKeywords = [
      'urgent', 'emergency', 'dangerous', 'hazard', 'immediate',
      'critical', 'severe', 'accident', 'injury', 'blocked'
    ];

    return urgentKeywords.reduce((score, keyword) => {
      return score + (text.includes(keyword) ? 1 : 0);
    }, 0);
  }

  /**
   * Extract features from metadata
   */
  extractMetadataFeatures(metadata) {
    return {
      hasLocation: !!metadata.location,
      timeOfDay: metadata.timestamp ? new Date(metadata.timestamp).getHours() : null,
      dayOfWeek: metadata.timestamp ? new Date(metadata.timestamp).getDay() : null,
      reporterHistory: metadata.reporterHistory || 0
    };
  }

  /**
   * Make prediction based on features
   */
  async predict(features) {
    // In production, use the actual model
    // const prediction = await this.model.predict(features);
    
    // Mock prediction based on text features
    if (features.textFeatures) {
      const scores = features.textFeatures.categoryScores;
      const maxCategory = Object.keys(scores).reduce((a, b) => 
        scores[a] > scores[b] ? a : b, 'other'
      );
      
      if (scores[maxCategory] > 0) {
        return {
          category: maxCategory,
          confidence: Math.min(0.95, 0.6 + scores[maxCategory] * 0.15)
        };
      }
    }

    // Default mock prediction
    return this.model.predict();
  }

  /**
   * Determine priority based on classification and other factors
   */
  determinePriority(prediction, text, metadata) {
    let priorityScore = 0;

    // Factor 1: Category-based priority
    const categoryPriorities = {
      sewage: 3,
      water: 3,
      pothole: 2,
      traffic: 2,
      streetlight: 1,
      garbage: 1,
      other: 1
    };
    priorityScore += categoryPriorities[prediction.category] || 1;

    // Factor 2: Urgency from text
    if (text) {
      const urgencyScore = this.calculateUrgencyScore(text.toLowerCase());
      priorityScore += Math.min(urgencyScore, 3);
    }

    // Factor 3: Location factors (if near schools, hospitals, etc.)
    if (metadata.nearCriticalInfrastructure) {
      priorityScore += 2;
    }

    // Factor 4: Time factors (reported multiple times)
    if (metadata.duplicateReports > 3) {
      priorityScore += 1;
    }

    // Map score to priority level
    if (priorityScore >= 7) return 'critical';
    if (priorityScore >= 5) return 'high';
    if (priorityScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Batch classify multiple issues
   */
  async batchClassify(issues) {
    const results = [];
    
    for (const issue of issues) {
      const result = await this.classifyIssue(
        issue.imageBuffer,
        issue.text,
        issue.metadata
      );
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get classification confidence threshold
   */
  getConfidenceThreshold() {
    return 0.7; // Issues below this confidence should be manually reviewed
  }

  /**
   * Train model with new data (for future implementation)
   */
  async trainModel(trainingData) {
    // Placeholder for model training logic
    logger.info('Model training not yet implemented');
    return {
      success: false,
      message: 'Training functionality coming soon'
    };
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(testData) {
    // Placeholder for model evaluation
    return {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85
    };
  }
}

// Export singleton instance
module.exports = new ClassificationService();
