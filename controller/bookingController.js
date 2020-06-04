const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// require('stripe'), this then envove a fn basically and in that we need to pass stripe
// secrect key (process.env.STRIPE_SECRET_KEY) and then it will give us a stripe obj that we can work with
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  // 2) Create checkout session
  // 2A) install stripe npm package: npm i stripe
  // 2B) Go to stipe dashboard and click on : Get your test API keys and get the secret key
  // and put them in config.env

  // create fn returns a promise
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`, //putting the data needed to create booking in this url (tempororly)
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`, // redirected if user cancel this payment
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`], // this image should be one which is live (uploaded on net) bcz stripe will take it to stripe database
        amount: tour.price * 100, //price of tour// tour.price * 100, changing dollar to cent(*100)
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session, //sending the session
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only Temporary , bcz it's unsecure : everyone can make bookings without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();

  // adding to db
  await Booking.create({ tour, user, price });
  // req.originalUrl.split('?')[0] is  equal to ${req.protocol}://${req.get('host')}/
  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
