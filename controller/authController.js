const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

// creating a token function instead of reapeating code again and again
const signToken = (id) => {
  // jwt.sign({ id: id }) can also be writtten as jwt.sign({ id})
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true,
    httpOnly: true, // means we cannot modify the cookie not even in the browser
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // sending a cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.logout = (req, res) => {
  // here we are not sending a token in cookie but a simple strinng loggedout  and it will not match with that loggedin cookie so user will be loggedOut
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

// creating a new user -> giving it a name signup
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  //when user signup we send them email
  // htttp        ://  127.0.0.1:3000  /me
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  // end
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // read email and password from body- using destructuring,since req.body.email , email property name is same as variable name so we can write simply as below;
  const { email, password } = req.body;

  // 1) Check if email and password exists
  if (!email || !password) {
    //simply create and show error using global error handler that we earlier created
    return next(new AppError('Please provide email and password', 400));
    // using return so that after next this login fn finishes rightway without running below code
  }

  // 2) Check if user exists && password is correct
  // find user by email:- insted of findOne({email:email}) use can also use findOne({email})
  // inside userModel in password we used -> select: false, // so it didnot show up in any output, when we getall users
  // but for checking we need password also so we will use select() fn and inside '+password' use + and name password to get it back, + is used to get a field which is by deafult not selected and then the name od the field
  const user = await User.findOne({ email }).select('+password');
  //console.log(user)

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // 3) If everything is ok, send token to client
  // generate a token same as above
  createSendToken(user, 200, res);
});

// middleware fn
exports.protect = catchAsync(async (req, res, next) => {
  // 1) getting token and checking if it exists

  /// tokens are always get by using headers, in post click on headers, and in key
  // add authorization and in value add  Bearer space tokenvalue ie. Bearer ansbhfcbsuchsbcbsdchgvdsu and send get req on 127.0.0.1:300/api/v1/tours
  // and we get taht token in console
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; // from splitting Bearer ansbhfcbsuchsbcbsdchgvdsu from space into array and then taking 2nd elt of arrray i.e [1] token
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // console.log(token);

  // checking if token is there or not
  if (!token) {
    // no token means we are not logged in
    return next(
      new AppError('You are not logged in !,please log in to get access.', 401)
    );
  }

  // 2) Verification of token : ie. someone manipulated the token or token already expires

  // verify() fn is an async fn , first argument is token, 2nd is secret, and third is call back
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(decoded);
  // 3) Check if user still exists after verification
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }
  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }

  //grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next(); // if all 4 steps worked then next will be called
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array ex ['admin','lead-guide']
    // here bcz of closure we have access to roles
    if (!roles.includes(req.user.role)) {
      // roles me CurrentUser nahi aaya agar to
      return next(
        new AppError('You do not have permission to perform this acion', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  // now verify user exists or not
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }
  // 2) Generate the random reset token
  const resetToken = user.correctPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //validateBeforeSave: false  ,this will deactivate all the validators in our schema and then directly
  /// it will work in postman with this route 127.0.0.1:3000/api/v1/users/forgotPassword
  // and for testing this specify email add in body  { "email": "hello@jonas.io"} which is existing in db and then after request we will have passwordResetToken in our db in that email and we will also have passwordEpiresAt

  try {
    // Send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    // here current user is user
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // bcz above 2 as undefined only modify data and dont save it so use this as below
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email, Try again later!.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  // encrypting the token send to mail . req.params.token since in url we add /resetPassword/:token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // now get user based upon token :matching user with this token from db
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gte: Date.now() }, // aslo here checking if token has been expired or not ,if token not expired then send
  }); // finding both tokens and cheching user details

  // 2) If token has not expired, and there is user, set the new passsword
  if (!user) {
    return next(new AppError('Token is invalid or has expired!.', 400));
  }
  // else set password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // now delete passwordresettoken and expires
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3) Update changedPasswordAt property for the user
  //this is a middleware .save() middleware in userModel.js so no need to add here
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection and ask for password
  const user = await User.findById(req.user.id).select('+password');
  // 2) check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('your current password is wrong', 401));
  }
  // 3) If so(password is correct), update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); // we want validation to happen to don't use  validateBeforeSave: false
  // User.findByIdAndUpdate will Not work as intended
  // 4) Log user In, send JWT
  createSendToken(user, 200, res);
});

// Only for rendered pages, and there will be no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // cookie from browser

      // 1) verifiy the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in user
      // res.locals in pug template
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
