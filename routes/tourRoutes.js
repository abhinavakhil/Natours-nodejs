const express = require('express');
const tourController = require('../controller/tourController');
const authController = require('./../controller/authController');
const reviewRouter = require('./../routes/reviewRoutes');
// change it to router from touRouter bcz it is conventional
const router = express.Router();
//  router.param('id', tourController.checkID);

// POST /tour/234fasfsfhfkhsd/reviews
// GET /tour/238urdhhjfbsdinh/reviews

// reroute to reviewrouter , bcz ot this it will work in both get and post (ie, whenever a url like this will be envcounter it will redirect it to reviewroutes)
router.use('/:tourId/reviews', reviewRouter);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// insted we can also do like this
// /tours-distance?distance=233&center=-40,45&unit=mi
// but we are doing like this
// /tours-distance/233/center/-40,45/units/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
