import mongoose, { Document, Schema, Model } from 'mongoose'
import { ROUTING_RULE_TYPES, RoutingRuleType, DEFAULT_ESCALATION_TIMEOUT } from '../utils/constants.js'

// Sub-document interfaces
export interface IAgentWeight {
  agentId: mongoose.Types.ObjectId
  percentage: number
}

export interface IZipCodeMapping {
  zipCodes: string[]
  agentId: mongoose.Types.ObjectId
}

export interface IScheduleWindow {
  dayOfWeek: number[]
  startHour: number
  endHour: number
}

export interface IAgentSchedule {
  agentId: mongoose.Types.ObjectId
  timezone: string
  windows: IScheduleWindow[]
}

export interface IRoutingRule extends Document {
  name: string
  type: RoutingRuleType
  isActive: boolean
  priority: number
  brokerageId: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId

  // Round-Robin
  assignedAgentIds: mongoose.Types.ObjectId[]
  lastAssignedIndex: number

  // Weighted
  agentWeights: IAgentWeight[]

  // Zip-Code
  zipCodeMappings: IZipCodeMapping[]

  // Time-of-Day
  schedules: IAgentSchedule[]
  escalationTimeoutSeconds: number

  createdAt: Date
  updatedAt: Date
}

// Sub-schemas
const agentWeightSchema = new Schema<IAgentWeight>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
    },
  },
  { _id: false }
)

const zipCodeMappingSchema = new Schema<IZipCodeMapping>(
  {
    zipCodes: {
      type: [String],
      required: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: false }
)

const scheduleWindowSchema = new Schema<IScheduleWindow>(
  {
    dayOfWeek: {
      type: [Number],
      required: true,
    },
    startHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
    endHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
  },
  { _id: false }
)

const agentScheduleSchema = new Schema<IAgentSchedule>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'America/New_York',
    },
    windows: {
      type: [scheduleWindowSchema],
      required: true,
    },
  },
  { _id: false }
)

const routingRuleSchema = new Schema<IRoutingRule>(
  {
    name: {
      type: String,
      required: [true, 'Routing rule name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: Object.values(ROUTING_RULE_TYPES),
      required: [true, 'Routing rule type is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      required: [true, 'Priority is required'],
      default: 10,
      min: [1, 'Priority minimum is 1'],
      max: [999, 'Priority maximum is 999'],
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },

    // Round-Robin fields
    assignedAgentIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    lastAssignedIndex: {
      type: Number,
      default: -1,
    },

    // Weighted fields
    agentWeights: {
      type: [agentWeightSchema],
      default: [],
    },

    // Zip-Code fields
    zipCodeMappings: {
      type: [zipCodeMappingSchema],
      default: [],
    },

    // Time-of-Day fields
    schedules: {
      type: [agentScheduleSchema],
      default: [],
    },
    escalationTimeoutSeconds: {
      type: Number,
      default: DEFAULT_ESCALATION_TIMEOUT,
      min: [10, 'Escalation timeout must be at least 10 seconds'],
      max: [600, 'Escalation timeout cannot exceed 10 minutes'],
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for priority-based rule evaluation within a brokerage
routingRuleSchema.index({ brokerageId: 1, isActive: 1, priority: 1 })
routingRuleSchema.index({ brokerageId: 1, name: 1 }, { unique: true })

export const RoutingRule: Model<IRoutingRule> =
  mongoose.models.RoutingRule || mongoose.model<IRoutingRule>('RoutingRule', routingRuleSchema)
