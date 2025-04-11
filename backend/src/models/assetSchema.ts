import mongoose, { Document, Schema } from 'mongoose';

interface IAsset extends Document {
  name: string;
  type: 'bank_account' | 'insurance' | 'vehicle';
  accountNumber?: string;
  policyNumber?: string;
  balanceAmount?: number;
  insuredAmount?: number;
  renewalDate?: Date;
  source: 'static' | 'detected';
  userId: mongoose.Types.ObjectId; // Add user association
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>({
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['bank_account', 'insurance', 'vehicle'] 
  },
  accountNumber: { type: String },
  policyNumber: { type: String },
  balanceAmount: { type: Number },
  insuredAmount: { type: Number },
  renewalDate: { type: Date },
  source: { 
    type: String, 
    required: true, 
    enum: ['static', 'detected'],
    default: 'static'
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Asset = mongoose.model<IAsset>('Asset', AssetSchema);

export { Asset, IAsset };