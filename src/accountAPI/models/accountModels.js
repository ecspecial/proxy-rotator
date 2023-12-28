import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, required: true },
  gender: { type: String, required: true },
  status: { type: String, required: true },
}, { collection: 'accounts' });

const AccountModel = mongoose.model('Account', accountSchema);

export default AccountModel;