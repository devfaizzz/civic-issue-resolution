const Issue = require('../models/Issue');
const User = require('../models/User');
const logger = require('../utils/logger');
const { startOfDay, endOfDay, subDays, format } = require('date-fns');

class AnalyticsService {
  /**
   * Get overall system statistics
   */
  async getOverallStats() {
    try {
      const stats = await Issue.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            byCategory: [
              { $group: { _id: '$category', count: { $sum: 1 } } }
            ],
            byPriority: [
              { $group: { _id: '$priority', count: { $sum: 1 } } }
            ],
            avgResolutionTime: [
              {
                $match: {
                  'resolution.resolvedAt': { $exists: true }
                }
              },
              {
                $project: {
                  resolutionTime: {
                    $divide: [
                      { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                      1000 * 60 * 60 * 24 // Convert to days
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  avgTime: { $avg: '$resolutionTime' }
                }
              }
            ]
          }
        }
      ]);

      return {
        total: stats[0].total[0]?.count || 0,
        byStatus: this.formatGroupData(stats[0].byStatus),
        byCategory: this.formatGroupData(stats[0].byCategory),
        byPriority: this.formatGroupData(stats[0].byPriority),
        avgResolutionTime: stats[0].avgResolutionTime[0]?.avgTime || 0
      };
    } catch (error) {
      logger.error('Error getting overall stats:', error);
      throw error;
    }
  }

  /**
   * Get time-based trends
   */
  async getTrends(days = 30) {
    try {
      const startDate = subDays(new Date(), days);
      
      const trends = await Issue.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            statuses: {
              $push: {
                status: '$_id.status',
                count: '$count'
              }
            },
            total: { $sum: '$count' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return trends;
    } catch (error) {
      logger.error('Error getting trends:', error);
      throw error;
    }
  }

  /**
   * Get heatmap data for geographical distribution
   */
  async getHeatmapData(bounds = null) {
    try {
      const match = { 'location.coordinates': { $exists: true } };
      
      if (bounds) {
        match['location.coordinates'] = {
          $geoWithin: {
            $box: [
              [bounds.southwest.lng, bounds.southwest.lat],
              [bounds.northeast.lng, bounds.northeast.lat]
            ]
          }
        };
      }

      const heatmap = await Issue.find(match)
        .select('location.coordinates category priority status')
        .lean();

      return heatmap.map(issue => ({
        lat: issue.location.coordinates[1],
        lng: issue.location.coordinates[0],
        intensity: this.calculateIntensity(issue),
        category: issue.category,
        status: issue.status
      }));
    } catch (error) {
      logger.error('Error getting heatmap data:', error);
      throw error;
    }
  }

  /**
   * Get department performance metrics
   */
  async getDepartmentPerformance(departmentId = null) {
    try {
      const match = {};
      if (departmentId) {
        match['assignedTo.department'] = departmentId;
      }

      const performance = await Issue.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$assignedTo.department',
            totalAssigned: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
              }
            },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $ne: ['$resolution.resolvedAt', null] },
                  {
                    $divide: [
                      { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                      1000 * 60 * 60 * 24
                    ]
                  },
                  null
                ]
              }
            },
            pending: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['new', 'acknowledged', 'in_progress']] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'department'
          }
        },
        {
          $project: {
            department: { $arrayElemAt: ['$department', 0] },
            totalAssigned: 1,
            resolved: 1,
            pending: 1,
            avgResolutionTime: 1,
            resolutionRate: {
              $multiply: [
                { $divide: ['$resolved', '$totalAssigned'] },
                100
              ]
            }
          }
        }
      ]);

      return performance;
    } catch (error) {
      logger.error('Error getting department performance:', error);
      throw error;
    }
  }

  /**
   * Get citizen engagement metrics
   */
  async getCitizenEngagement() {
    try {
      const engagement = await User.aggregate([
        {
          $match: { role: 'citizen' }
        },
        {
          $project: {
            name: 1,
            email: 1,
            'statistics.totalReports': 1,
            'statistics.resolvedReports': 1,
            'statistics.averageRating': 1,
            lastLogin: 1,
            createdAt: 1,
            engagementScore: {
              $add: [
                { $multiply: ['$statistics.totalReports', 2] },
                { $multiply: ['$statistics.resolvedReports', 3] },
                { $multiply: ['$statistics.averageRating', 10] }
              ]
            }
          }
        },
        {
          $sort: { engagementScore: -1 }
        },
        {
          $limit: 100
        }
      ]);

      return engagement;
    } catch (error) {
      logger.error('Error getting citizen engagement:', error);
      throw error;
    }
  }

  /**
   * Get response time analytics
   */
  async getResponseTimeAnalytics() {
    try {
      const responseTime = await Issue.aggregate([
        {
          $match: {
            'timeline.1': { $exists: true } // Has at least one status update
          }
        },
        {
          $project: {
            category: 1,
            priority: 1,
            firstResponseTime: {
              $divide: [
                {
                  $subtract: [
                    { $arrayElemAt: ['$timeline.timestamp', 1] },
                    '$createdAt'
                  ]
                },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              priority: '$priority'
            },
            avgResponseTime: { $avg: '$firstResponseTime' },
            minResponseTime: { $min: '$firstResponseTime' },
            maxResponseTime: { $max: '$firstResponseTime' }
          }
        }
      ]);

      return responseTime;
    } catch (error) {
      logger.error('Error getting response time analytics:', error);
      throw error;
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(date = new Date()) {
    try {
      const start = startOfDay(date);
      const end = endOfDay(date);

      const report = await Issue.aggregate([
        {
          $facet: {
            created: [
              {
                $match: {
                  createdAt: { $gte: start, $lte: end }
                }
              },
              { $count: 'count' }
            ],
            resolved: [
              {
                $match: {
                  'resolution.resolvedAt': { $gte: start, $lte: end }
                }
              },
              { $count: 'count' }
            ],
            byCategory: [
              {
                $match: {
                  createdAt: { $gte: start, $lte: end }
                }
              },
              {
                $group: {
                  _id: '$category',
                  count: { $sum: 1 }
                }
              }
            ],
            highPriority: [
              {
                $match: {
                  createdAt: { $gte: start, $lte: end },
                  priority: { $in: ['high', 'critical'] }
                }
              },
              { $count: 'count' }
            ]
          }
        }
      ]);

      return {
        date: format(date, 'yyyy-MM-dd'),
        issuesCreated: report[0].created[0]?.count || 0,
        issuesResolved: report[0].resolved[0]?.count || 0,
        byCategory: this.formatGroupData(report[0].byCategory),
        highPriorityIssues: report[0].highPriority[0]?.count || 0
      };
    } catch (error) {
      logger.error('Error generating daily report:', error);
      throw error;
    }
  }

  /**
   * Get predictive analytics (mock implementation)
   */
  async getPredictiveAnalytics() {
    try {
      // This would use ML models in production
      const historicalData = await this.getTrends(90);
      
      return {
        expectedIssuesNextWeek: Math.floor(Math.random() * 50) + 100,
        hotspotAreas: [
          { area: 'Downtown', expectedIssues: 25 },
          { area: 'Industrial Zone', expectedIssues: 18 },
          { area: 'Residential North', expectedIssues: 12 }
        ],
        recommendedStaffing: {
          monday: 8,
          tuesday: 7,
          wednesday: 9,
          thursday: 8,
          friday: 10,
          saturday: 5,
          sunday: 4
        }
      };
    } catch (error) {
      logger.error('Error getting predictive analytics:', error);
      throw error;
    }
  }

  /**
   * Helper function to format grouped data
   */
  formatGroupData(data) {
    const formatted = {};
    data.forEach(item => {
      formatted[item._id] = item.count;
    });
    return formatted;
  }

  /**
   * Calculate intensity for heatmap
   */
  calculateIntensity(issue) {
    const priorityWeights = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.3
    };
    
    const statusWeights = {
      new: 1.0,
      acknowledged: 0.8,
      in_progress: 0.6,
      resolved: 0.2,
      closed: 0.1
    };

    return (priorityWeights[issue.priority] || 0.5) * 
           (statusWeights[issue.status] || 0.5);
  }

  /**
   * Export report to various formats
   */
  async exportReport(type = 'csv', dateRange = null) {
    // Implementation for CSV/PDF export
    logger.info(`Exporting ${type} report`);
    return {
      message: 'Export functionality to be implemented',
      type,
      dateRange
    };
  }
}

module.exports = new AnalyticsService();
