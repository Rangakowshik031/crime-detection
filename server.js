const express = require('express');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const session = require('express-session');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB
mongoose.connect('mongodb://localhost/imageDatabase', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// User schema and model
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

const User = mongoose.model('User', userSchema);

// Image schema and model
const imageSchema = new mongoose.Schema({
  data: Buffer,
  hash: String
});

const Image = mongoose.model('Image', imageSchema);

// Hash function to compare images
function hashImage(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Email configuration
const transporter = nodemailer.createTransport({
//   host: 'smtp.example.com', // Replace with your email host
//   port: 587, // Replace with your email port
//   secure: false,
service: 'gmail',
  auth: {
    user: 'goudkowshik560@gmail.com', // Replace with your email address
    pass: 'qsuvwweaakswjiep' // Replace with your email password
  }
});

// Session configuration
app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
// Serve login.html page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
  });
  
  // Serve signup.html page
  app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/signup.html');
  });
  
// Serve the index.html page
app.get('/', (req, res) => {
  if (req.session.loggedin) {
    res.sendFile(__dirname + '/index.html');
  } else {
    res.redirect('/login');
  }
});

// Route for login
app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const user = await User.findOne({ username: username, password: password });
    if (user) {
      req.session.loggedin = true;
      res.redirect('/');
    } else {
      res.send('Invalid username or password.');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error occurred.');
  }
});

// Route for logout
app.get('/logout', (req, res) => {
  req.session.loggedin = false;
  res.redirect('/');
});

// Route for signup
app.post('/signup', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      res.send('Username already exists. Please choose a different username.');
    } else {
      const newUser = new User({
        username: username,
        password: password
      });
      await newUser.save();
      res.send('User created successfully.');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error occurred.');
  }
});

// Route for uploading image
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).send('No file uploaded.');
    return;
  }

 
  const uploadedImage = fs.readFileSync(req.file.path);
  const uploadedImageHash = hashImage(uploadedImage);

  try {
    const storedImage = await Image.findOne({ hash: uploadedImageHash });

    if (storedImage) {
      // Send email notification with attached image
      const mailOptions = {
        from: 'goudkowshik560@gmail.com', // Replace with your email address
        to: 'rangakowshik12@gmail.com', // Replace with the recipient's email address
        subject: 'Image Identified',
        text: 'The uploaded image has been identified.',
        attachments: [
          {
            filename: 'matched_image.jpg',
            content: uploadedImage
          }
        ]
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });

      res.send('Image matched! Email notification sent.');
    } else {
      const newImage = new Image({
        data: uploadedImage,
        hash: uploadedImageHash
      });
      await newImage.save();
      res.send('Image stored in the database.');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error occurred.');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000.');
});
