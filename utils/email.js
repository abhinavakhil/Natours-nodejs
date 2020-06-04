const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0]; // taking firstname from name
    this.url = url;
    this.from = `Abhinav Akhil <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //SendGrid : send real email
      return nodemailer.createTransport({
        service: 'SendGrid', // we dont have to specify host and port as send grid alreadyknows when we specify  service
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    // else send email to mailtrap
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        // auth for authentication
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject, // subject: subject
      html, //html:html
      text: htmlToText.fromString(html), // converting html to text
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions); // this returns a promise
  }

  async sendWelcome() {
    // calling the send fn
    /////////// template name (welcome.pug) & 2nd argument as subject
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};
