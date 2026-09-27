'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: true }
);

const ProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0, min: 0 },
    weekly_xp: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    gems: { type: Number, default: 0, min: 0 },
    hearts: { type: Number, default: 5, min: 0, max: 5 },
    league: { type: String, default: 'bronze', enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] },
    achievements: { type: [String], default: [] },
    interviews_completed: { type: Number, default: 0, min: 0 },
    avatar: { type: String, default: '', maxlength: 200 },
    theme: { type: String, default: '', maxlength: 40 },
    last_active: { type: Date },
  },
  { timestamps: true }
);

const INTERVIEW_STATUSES = ['active', 'ended'];
const InterviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, default: 'General', maxlength: 120 },
    mode: { type: String, default: 'solo', enum: ['solo'] },
    difficulty: { type: String, default: 'standard', enum: ['easy', 'standard', 'hard'] },
    resume_text: { type: String, default: '', maxlength: 60000 },
    jd_text: { type: String, default: '', maxlength: 60000 },
    status: { type: String, default: 'active', enum: INTERVIEW_STATUSES, index: true },
    current_turn: { type: Number, default: 0, min: 0 },
    started_question: { type: String, default: '' },
  },
  { timestamps: true }
);

const TurnSchema = new Schema(
  {
    interview: { type: Schema.Types.ObjectId, ref: 'Interview', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    turn_number: { type: Number, required: true, min: 1 },
    question: { type: String, default: '' },
    user_answer: { type: String, default: '' },
    retrieved_facts: { type: String, default: '' },
    score: { type: Number, default: 0, min: 0, max: 10 },
    feedback: { type: String, default: '' },
    next_question: { type: String, default: '' },
    engine: { type: String, default: 'offline-heuristic' },
  },
  { timestamps: true }
);
TurnSchema.index({ interview: 1, turn_number: 1 }, { unique: true });

const ReportSchema = new Schema(
  {
    interview: { type: Schema.Types.ObjectId, ref: 'Interview', required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    overall_score: { type: Number, default: 0, min: 0, max: 10 },
    summary: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    roadmap: { type: [String], default: [] },
    xp_earned: { type: Number, default: 0 },
    engine: { type: String, default: 'offline-heuristic' },
    behavioral_metrics: {
      filler_words: {
        total_count: { type: Number, default: 0 },
        frequency_per_100_words: { type: Number, default: 0 },
        breakdown: [{ word: String, count: Number }],
      },
      repeated_words: [{ word: String, count: Number }],
      grammar_issues: [
        {
          issue: { type: String, default: '' },
          example: { type: String, default: '' },
          suggestion: { type: String, default: '' },
        },
      ],
      delivery_and_pacing: {
        pace_assessment: { type: String, default: 'Balanced' },
        avg_words_per_turn: { type: Number, default: 0 },
        conciseness_score: { type: Number, default: 8 },
        notes: { type: String, default: '' },
      },
      real_interview_tips: { type: [String], default: [] },
    },
    comparison: {
      has_previous: { type: Boolean, default: false },
      previous_score: { type: Number, default: null },
      score_delta: { type: Number, default: 0 },
      filler_delta: { type: Number, default: 0 },
      improvements: { type: [String], default: [] },
      persistent_issues: { type: [String], default: [] },
      message: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

const AtsScanSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ats_score: { type: Number, required: true },
    component_scores: {
      formatting: { type: Number, default: 0 },
      keywords: { type: Number, default: 0 },
      content: { type: Number, default: 0 },
      skill_validation: { type: Number, default: 0 },
      ats_compatibility: { type: Number, default: 0 },
    },
    matched_keywords: { type: [String], default: [] },
    missing_keywords: { type: [String], default: [] },
    language_analysis: {
      weak_verbs: { type: [String], default: [] },
      repetitive_phrases: { type: [String], default: [] },
      grammar_improvements: [
        {
          issue: { type: String, default: '' },
          fix: { type: String, default: '' },
        },
      ],
      bullet_structure_score: { type: Number, default: 8 },
    },
    strengths: { type: [String], default: [] },
    critical_issues: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    real_interview_alignment: { type: [String], default: [] },
    score_delta: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const DomainKnowledgeSchema = new Schema(
  {
    role_category: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);
const Progress = mongoose.model('Progress', ProgressSchema);
const Interview = mongoose.model('Interview', InterviewSchema);
const Turn = mongoose.model('Turn', TurnSchema);
const Report = mongoose.model('Report', ReportSchema);
const AtsScan = mongoose.model('AtsScan', AtsScanSchema);
const DomainKnowledge = mongoose.model('DomainKnowledge', DomainKnowledgeSchema);

module.exports = { User, Progress, Interview, Turn, Report, AtsScan, DomainKnowledge };
