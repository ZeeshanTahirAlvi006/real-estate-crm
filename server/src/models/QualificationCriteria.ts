import mongoose, { Document, Schema, Model } from 'mongoose'

export type CriteriaCategory = 'budget' | 'timeline' | 'pre_approval' | 'location' | 'home_to_sell'

export interface IQualificationCriteria extends Document {
  brokerageId: mongoose.Types.ObjectId
  category: CriteriaCategory
  label: string
  isRequired: boolean
  promptDirective: string
  options?: string[]
  order: number
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const qualificationCriteriaSchema = new Schema<IQualificationCriteria>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    category: {
      type: String,
      enum: ['budget', 'timeline', 'pre_approval', 'location', 'home_to_sell'],
      required: [true, 'Category is required'],
    },
    label: {
      type: String,
      required: [true, 'Label is required'],
      trim: true,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    promptDirective: {
      type: String,
      required: [true, 'Prompt directive is required'],
    },
    options: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

qualificationCriteriaSchema.index({ brokerageId: 1, order: 1 })

export const QualificationCriteria: Model<IQualificationCriteria> =
  mongoose.models.QualificationCriteria ||
  mongoose.model<IQualificationCriteria>('QualificationCriteria', qualificationCriteriaSchema)
