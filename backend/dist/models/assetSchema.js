import mongoose, { Schema } from 'mongoose';
const AssetSchema = new Schema({
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
const Asset = mongoose.model('Asset', AssetSchema);
export { Asset };
