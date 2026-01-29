const Issue = require('../models/Issue');

const getPublicIssues = async (req, res) => {
  const issues = await Issue.find({ isPublic: true }).sort({ createdAt: -1 }).limit(100).lean();
  return res.status(200).json({ issues });
};

const getPublicIssueById = async (req, res) => {
  return res.status(200).json({ id: req.params.id, issue: null });
};

const getNearbyIssues = async (req, res) => {
  return res.status(200).json({ issues: [], message: 'Nearby issues placeholder' });
};

const getIssueStatistics = async (req, res) => {
  return res.status(200).json({ stats: {} });
};

const createIssue = async (req, res) => {
  const userId = (req.user?._id || req.user?.id) || null;
  const { title, description, category, latitude, longitude, address, priority } = req.body;
  if (!title || !description || !category || !latitude || !longitude) return res.status(400).json({ message: 'Missing fields' });
  const issue = await Issue.create({
    title, description, category, priority: priority || 'medium',
    location: { type: 'Point', coordinates: [Number(longitude), Number(latitude)], address },
    reportedBy: userId
  });
  // Realtime notify
  req.app.get('io').emit('issue:new', { id: issue._id, title: issue.title, category: issue.category, status: issue.status });
  return res.status(201).json({ id: issue._id });
};

const getMyIssues = async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const issues = await Issue.find({ reportedBy: userId }).sort({ createdAt: -1 }).lean();
  return res.status(200).json({ issues });
};

const getIssueById = async (req, res) => {
  return res.status(200).json({ id: req.params.id, issue: null });
};

const updateIssue = async (req, res) => {
  return res.status(200).json({ id: req.params.id, message: 'Issue updated (stub)' });
};

const deleteIssue = async (req, res) => {
  return res.status(200).json({ id: req.params.id, message: 'Issue deleted (stub)' });
};

const addComment = async (req, res) => {
  return res.status(201).json({ id: req.params.id, message: 'Comment added (stub)' });
};

const toggleUpvote = async (req, res) => {
  return res.status(200).json({ id: req.params.id, upvoted: true });
};

const submitFeedback = async (req, res) => {
  return res.status(201).json({ id: req.params.id, message: 'Feedback submitted (stub)' });
};

const updateIssueStatus = async (req, res) => {
  const { status } = req.body;
  const issue = await Issue.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!issue) return res.status(404).json({ message: 'Issue not found' });
  if (issue.reportedBy) req.app.get('io').to(`user-${issue.reportedBy}`).emit('issue:status', { id: issue._id, status: issue.status });
  req.app.get('io').emit('issue:updated', { id: issue._id, status: issue.status });
  return res.status(200).json({ id: issue._id, status: issue.status });
};

const assignIssue = async (req, res) => {
  return res.status(200).json({ id: req.params.id, assignee: req.body.assignee || null });
};

const updatePriority = async (req, res) => {
  return res.status(200).json({ id: req.params.id, priority: req.body.priority || 'medium' });
};

const resolveIssue = async (req, res) => {
  return res.status(200).json({ id: req.params.id, message: 'Issue resolved (stub)' });
};

const getCategoryDistribution = async (req, res) => {
  return res.status(200).json({ distribution: {} });
};

const getResolutionTimeStats = async (req, res) => {
  return res.status(200).json({ resolutionTime: {} });
};

const getIssueHeatmap = async (req, res) => {
  return res.status(200).json({ heatmap: [] });
};

const batchClassifyIssues = async (req, res) => {
  return res.status(200).json({ processed: 0 });
};

const batchUpdateStatus = async (req, res) => {
  return res.status(200).json({ updated: 0 });
};

module.exports = {
  getPublicIssues,
  getPublicIssueById,
  getNearbyIssues,
  getIssueStatistics,
  createIssue,
  getMyIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  addComment,
  toggleUpvote,
  submitFeedback,
  updateIssueStatus,
  assignIssue,
  updatePriority,
  resolveIssue,
  getCategoryDistribution,
  getResolutionTimeStats,
  getIssueHeatmap,
  batchClassifyIssues,
  batchUpdateStatus,
};


