const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
let mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }
});

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', function(req, res) {
  let username = req.body.username;

  const user = new User({ username });

  user.save()
  .then(data => {
    res.json({ username: data.username, _id: data._id });
  })
  .catch(err => {
    res.status(500).json({ error: 'Failed to save user' });
  });
});

app.get('/api/users', function(req, res) {
  User.find({}, 'username _id')
    .then(data => {
      res.json(data); // returns array of users
    })
    .catch(err => {
      res.status(500).json({ error: 'Failed to retrieve users' });
    });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  const exerciseDate = date ? new Date(date) : new Date();

  User.findById(userId)
    .then(user => {
      if (!user) return res.status(400).json({ error: 'User not found' });

      const exercise = new Exercise({
        userId,
        description,
        duration: Number(duration),
        date: exerciseDate
      });

      return exercise.save().then(savedExercise => {
        res.json({
          _id: user._id,
          username: user.username,
          date: savedExercise.date.toDateString(),
          duration: savedExercise.duration,
          description: savedExercise.description
        });
      });
    })
    .catch(err => {
      res.status(500).json({ error: 'Server error' });
    });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  User.findById(userId)
    .then(user => {
      if (!user) return res.status(400).json({ error: 'User not found' });

      let filter = { userId };

      if (from || to) {
        filter.date = {};
        if (from) filter.date.$gte = new Date(from);
        if (to) filter.date.$lte = new Date(to);
      }

      let query = Exercise.find(filter).select('description duration date');
      if (limit) {
        query = query.limit(Number(limit));
      }

      return query.exec().then(exercises => {
        const log = exercises.map(ex => ({
          description: ex.description,
          duration: ex.duration,
          date: ex.date.toDateString()
        }));

        res.json({
          _id: user._id,
          username: user.username,
          count: log.length,
          log
        });
      });
    })
    .catch(err => {
      res.status(500).json({ error: 'Server error' });
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
