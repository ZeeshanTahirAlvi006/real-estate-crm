import mongoose, { Document, Schema } from 'mongoose'

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'is_empty'
  | 'is_not_empty'

export interface ISmartListFilter {
  id: string
  field: string
  operator: FilterOperator
  value: any // string, number, array of strings, boolean, etc.
}

export interface ISmartList extends Document {
  name: string
  filters: ISmartListFilter[]
  createdBy: mongoose.Types.ObjectId
  brokerageId: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const filterSchema = new Schema<ISmartListFilter>(
  {
    id: { type: String, required: true },
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: [
        'equals',
        'not_equals',
        'contains',
        'greater_than',
        'less_than',
        'between',
        'in',
        'is_empty',
        'is_not_empty'
      ],
      required: true,
    },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
)

const smartListSchema = new Schema<ISmartList>(
  {
    name: { type: String, required: true, trim: true },
    filters: { type: [filterSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    brokerageId: { type: Schema.Types.ObjectId, ref: 'Brokerage', required: true },
  },
  {
    timestamps: true,
  }
)

// Indexes for quick lookup
smartListSchema.index({ brokerageId: 1, createdBy: 1 })

export const SmartList = mongoose.model<ISmartList>('SmartList', smartListSchema)
