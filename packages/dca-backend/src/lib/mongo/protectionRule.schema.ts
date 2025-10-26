import mongoose, { Schema, Document } from 'mongoose';

export interface IProtectionRule extends Document {
  chainId: number;
  collateralAsset: string;
  debtAsset: string;
  isActive: boolean;
  jobId: string;
  protocol: string;
  repayAmount: string;
  triggerPrice: string;
  user: string;
}

const ProtectionRuleSchema: Schema = new Schema(
  {
    chainId: { required: true, type: Number },
    collateralAsset: { required: true, type: String },
    debtAsset: { required: true, type: String },
    isActive: { default: true, type: Boolean },
    jobId: { type: String },
    protocol: { default: 'AaveV3', required: true, type: String },
    repayAmount: { required: true, type: String },
    triggerPrice: { required: true, type: String },
    user: { index: true, required: true, type: String },
  },
  { timestamps: true }
);

export const ProtectionRule = mongoose.model<IProtectionRule>(
  'ProtectionRule',
  ProtectionRuleSchema
);
