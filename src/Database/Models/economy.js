const mongoose = require('mongoose');

const economySchema = new mongoose.Schema({
  userId: String,
  gem: { type: Number, default: 0, max: Number.MAX_SAFE_INTEGER },
  treasury: { type: Number, default: 0, max: Number.MAX_SAFE_INTEGER },
  luckPotion: { type: Number, default: 0, max: Number.MAX_SAFE_INTEGER },
  pepperSpray: { type: Number, default: 0, max: Number.MAX_SAFE_INTEGER },
  pokeball: { type: Number, default: 0, max: Number.MAX_SAFE_INTEGER },
  lastBonus: { type: Date, default: null },
  lastDaily: { type: Date, default: null },
  lastRob: { type: Date, default: null }
});

const Economy = mongoose.model('Economy', economySchema);
module.exports = Economy;
