const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

// schema
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      //validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      // restricting difficulty to only one of these three value - easy,medium,difficulty
      enum: {
        // enum is only for strings
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium,difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      // ie. ratings shoud be between 1 - 5
      // min and max is used for numbers and dates only
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'ratint must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, //4.66666, 46.666,47,4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this here will work only with creating new document not upon updating new document
          return val < this.price;
        },
        message: ' Discount price ({VALUE}) should be below the regular price',
      },
    },
    summary: {
      type: String,
      // schema type- trim -> it removes all white space from beginning and end. trim only works with strings
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, // name of image and later we will change it with uploaded image name
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], // array of strings
    createdAt: {
      // current date - timestamp
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJson
      type: {
        type: String,
        deafult: 'Point', // we can also select polygon etc
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number, // day on which people will go to this location
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId, // means we excpect a type of each elts in guides array to be a mongodb Id
        ref: 'User', // here it means that reference should be User i.e from user model & we also dont need this const User = require('./userModel'); and it will still work
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//indexes
// 1 means asc order of price , -1 means desc order of price
// tourSchema.index({ price: 1 });
// compound indexing
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//virtual populate  Tour
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// DOCUMENT MIDDLEWARE: it runs before .save() command and .create() but not before .insertMany()
// it will show the document(this the data that we create) before saving that to database
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
// // this slug will give a slug property by name

//Embedding
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id)); // this will return promises, so guidesPromises will be an aaray of promises
//   this.guides = await Promise.all(guidesPromises); // handling promise here using promise.all() method
//   next();
// });

// // it will execute after .save() are executed
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//  QUERY MIDDLEWARE

tourSchema.pre('/^find/', function (docs, next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// creating query middleware for populating
// it used a regular expression which will work on evry thing with query find
// this will points to current query whereever it matches find fn
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

tourSchema.post('/^find/', function (next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

// AGGREGATION MIDDLEWARE
// aggregation middleware allow us to add hooks before or after an aggregation happens
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });
// this will remove from document all the secrettours set to true

// creating model out of this schema
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
