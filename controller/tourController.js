const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
// route Handlers

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// for multiple image and multiple field
exports.uploadTourImages = upload.fields([
  // imageCover and images are fields of db
  { name: 'imageCover', maxCount: 1 }, // maxCount: 1 ,means we will have only 1 field for image cover which is then going to be processed
  { name: 'images', maxCount: 3 }, // maxCount:3 , so max 3 images in images array
]);

// for single image
// upload.single('image');  & req will be as req.file
// for multiple image and single field
// upload.array('images', 5); & req will be as req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // if no imageCover or images then return next
  if (!req.files.imageCover || !req.files.images) return next();
  //else
  //1) processing Cover image
  // tour-id        //timestamp  //extension
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // req.body.imageCover which we used above will update imageCover to db (in tour document)
  // since req.body has access to it on update, in updateOne fn

  //2) Images
  // using loop to process all 3 images at same time
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename); // pushing to db since req.body has access in updateOne
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        // _id: null,
        // _id: '$difficulty', // grouping : difficult . medium , easy
        _id: { $toUpper: 'difficulty' }, // in uppercase
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // 1 to do it in ascending order
    },
    {
      $match: { _id: { $ne: 'EASY' } },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  // this fn will calc no of tours each month for a given year ex - for 2021 , 1tour in april,1 in july etc
  const year = req.params.year * 1; // converting to number by multiplying with 1
  const plan = await Tour.aggregate([
    {
      // create 1 document for each field ie ex: here for startDates it will unwind each document
      $unwind: '$startDates',
    },
    // now select the document
    {
      $match: {
        startDates: {
          // greater or equal that to jan 01 2021
          $gte: new Date(`${year}-01-01`),
          // less than or equal to dec-31 2021
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        // group them based upon ??
        // here we are grouping them based upon months
        // so we can we aggregation pipeline operator($month) to get month
        _id: { $month: '$startDates' },
        // count no of tour in that month
        numTourStarts: { $sum: 1 },
        // which tour : based upon tour name we are creating an array using $push
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    // project works with 0 or 1 . 0 means not to show that field and 1 means to show
    {
      $project: {
        _id: 0, //here we are hiding id , we will use months insted since we added id value in months var
      },
    },
    {
      $sort: { numTourStarts: -1 }, // -1 for desscending , 1 for ascending
    },
    {
      $limit: 12, // limit documents to only 12
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  // here we used destructuring to get all these variable at once
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // radius = distance / radius of earth
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  // $geoWithin will find within
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  // geoNear should always be at first
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          // from which to calculate distance
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        // to show only data mentioned inside this
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
