const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true, // emails should be unique
    lowercase: true, // transform emails to lowercase
    // cheacking if email is valid or not by creating a custom validator using npm package valiator and fn isEmail
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8, // password rule: ie length of password should be atleast of 8 character
    select: false, // so it didnot show up in any output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    // confirming password is same or not
    validate: {
      // This only works on SAVE or create i.e(on creating a new user) not on updating a new user!!!,
      validator: function (el) {
        return el === this.password; // ie. el which is currentpassword === to password above
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date, // changed when user change their password
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// encryption
// middleware - document
userSchema.pre('save', async function (next) {
  //ecncryption of password will be done on creation of new user as well as while updating a existing user password
  // this refers to current document i.e current user
  if (!this.isModified('password')) return next(); // if password is not modified to nothing and go next()
  // otherwise encrypt or hash the password
  // we will use a popular hasing algorithm called bcrypt
  // 12 here is cost which determines how cpu intensive our process will be , 12 is good to go, higher cost more cpu intensive process and best password encryption
  this.password = await bcrypt.hash(this.password, 12); // hash() fn is async version and this will return a promise so we need to await and make async
  // now we need to delete the confirmpassword as we have first password encrypted
  // afer validation we need to delete it as we no longer need it in db
  this.passwordConfirm = undefined;
  next();
});

// query middleware for deleting
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  // find only documents whose active property is true
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre('save', function (next) {
  // when we modified password then we need to change passwordchangedAt property
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// create a fn to check that given password is same as the one user is looking for
// creating a function with name correctPassword and it will return true or false
// candidate password is what user is giving ex: pass12345( which is not hashed ) but userPassword is hashed
// so we are using bcrypt compare fn to check and convert candidatePassword to hash and compare it with userpassword
// then return either true or false and this bcrypt will also return promise so use async and wait
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  //we cannot use this.password since passowrd is selected as false
  return await bcrypt.compare(candidatePassword, userPassword);
};

// another instance method
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log(this.changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // JWTTimeStamp i.e token issued at this time and changedTime ie password is changed at i.e password should be chnaged after token is isssued
  }
  // false means not changed
  return false;
};

// another instance method
userSchema.methods.correctPasswordResetToken = function () {
  // here resettoken string cannot be that cryptograhycally strong as the the json toke
  // it can be any random string - so we can just use very simple random bytes function from the
  // built in crypto module ( no need to install it ) simply require this -> const crypto = require('crypto'); and use
  // randomBytes() fn , we need to pass no of character here, 32 and then using toString() method converting it to hexadecimal string
  const resetToken = crypto.randomBytes(32).toString('hex'); // this token is going to be sent to user only ( so it should not be added to db as plain txt without encryption  since if hacker get access then he can  access this and hack users account)
  // so lets encrpty it to avoid using plain text
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); // how we will add this to db so that we can verify the user so create 2 variable in schema  passwordResetToken: String,passwordResetExpires: Date
  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // valid only for 10 mins
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
