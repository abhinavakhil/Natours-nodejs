const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // parent referencing :for which tour is purchased & user who purchased the tour
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Bokking must belong to a Tour!'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User!'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price.'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  // for someone not have card , for cash payments
  paid: {
    type: Boolean,
    default: true,
  },
});

//populating

//we can populate all field off user since it will not be called very often
bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
