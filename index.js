const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require('body-parser')
const mongoose = require('mongoose')
const mySecret = process.env['MONGO_URI']

// Connect to database using mongoose
mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true })

// Database schemas
// User schema
const userSchema = new mongoose.Schema({
  username: {type: String, required: true}
})
let userModel = mongoose.model("user", userSchema)

// Exercise schema
const exerciseSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: new Date()}
})
let exerciseModel = mongoose.model("exercise", exerciseSchema)

// Initial setup
app.use(cors())
app.use(express.static('public'))
app.use('/', bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Add user to database with post request and use in response
app.post('/api/users', (req, res) => {
  let username = req.body.username
  let newUser = new userModel({username: username})
  newUser.save()
  res.json(newUser)
})

// Find array of all users with usernames and ids
app.get('/api/users', (req, res) => {
  userModel.find({}).then((users) => {
    res.json(users)
  })
})

// Update database to track exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
  let userId = req.params._id
  
  exerciseObj = {
    userId: userId,
    description: req.body.description,
    duration: req.body.duration
  }
  if (req.body.date != ''){
    exerciseObj.date = req.body.date
  }
  let newExercise = new exerciseModel(exerciseObj);
  try {
    let userFound = await userModel.findById(userId) 
    newExercise.save();
    res.json({
      username: userFound.username,
      description: newExercise.description, 
      duration: newExercise.duration,
      date: new Date(newExercise.date).toDateString(),
      _id: userFound._id
    })
  } catch(err){
    console.log(err)
    res.send("There was an error saving the exercise")
  }
})
  
// Exercise logs
app.get('/api/users/:_id/logs', async (req, res) => {
  
  let fromParam = req.query.from;
  let toParam = req.query.to;
  let limitParam = req.query.limit;  
  let userId = req.params._id;

  // If limit param exists set it to an integer
  limitParam = limitParam ? parseInt(limitParam) : limitParam

  let userFound = await userModel.findById(userId) 
    
      let queryObj = {
        userId: userId
      };
      // If we have a date add date params to the query
      if (fromParam || toParam){
    
          queryObj.date = {}
          if (fromParam){
            queryObj.date['$gte'] = fromParam;
          }
          if (toParam){
            queryObj.date['$lte'] = toParam;
          }
        }

    
    let exercises = await exerciseModel.find(queryObj).limit(limitParam).exec()
  
      let resObj = 
        {_id: userFound._id,
         username: userFound.username
        }
  
      exercises = exercises.map((x) => {
        return {
          description: x.description,
          duration: x.duration,
          date: new Date(x.date).toDateString()
        }
      })
      resObj.log = exercises;
      resObj.count = exercises.length;
      
      res.json(resObj);
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
