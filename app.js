const express = require('express');
const bodyParser = require('body-parser');
const VkBot = require('./lib');
const Markup = require('./lib/markup');
const questObj = require('./questions');
const Session = require('./lib/session');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const app = express();
const bot = new VkBot({
  token: 'f6f4f511b58e60eead7622ec875a7036ba82058346d3736a18c3c717f88a0d72667c7057c3e4ea6c492cd',
  confirmation: 'd588faa9',
});
const session = new Session();

let mongoDB = 'mongodb://someuser:abcd1234@ds163694.mlab.com:63694/productstutorial';
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
let db = mongoose.connection;

let UserSchema = new Schema({
    id: {type: String, required: true, max: 30},
    value: {type: Number, required: true},
    stage: {type: Number, required: true},
    isFinished: {type: Boolean, required: true}
});
let User = mongoose.model('User', UserSchema)  

let phrase = "Your current stage is ";

// number of loaded questions
let numbOfQuestions = questObj.length;

bot.use(session.middleware())

bot.on((ctx) => {

  // stage = number of current question
  let stage = -1;

  // value = current number of point added for answering questions
  let value = 0;

  // bool check if questioning finished
  let isFinished = false;

  ctx.session.counter = ctx.session.counter || 0;
  ctx.session.counter++;

  let id = ctx.message.from_id;

  // console.log(id)
  console.log(' ')
  console.log('_________________NEW MESSAGE_________________')
  console.log(' ')
  searchInDB(id, value, stage, isFinished, ctx)

  // countAndSave(id, value, stage, isFinished, ctx);

});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post('/', bot.webhookCallback);

app.listen(80);

// mongoose

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

function countAndSave(id, value, stage, isFinished, ctx) {
  console.log('countAndSave start')
  console.log(id, value, stage, isFinished)
  // vk bug with not dissapearing btns fix on hello-stage
  if (stage) {
    var answVal = Number(ctx.message.payload) ? Number(ctx.message.payload) : 0;
    value = value + answVal;
  }

  if (isFinished) {
    ctx.reply('Your number of points is ' + value);
    isFinished = false;
    return false;
  }

  if (stage >= numbOfQuestions) {
    // all questions were asked
    ctx.reply('That is all for a while!', null, Markup
    .keyboard([
        Markup.button('GET RESULTS!', 'primary') 
    ])
    .oneTime());
    isFinished = true;
    saveToDB(id, value, stage, isFinished)
    return false;
  }


  stage++;

  saveToDB(id, value, stage, isFinished, ctx)
}

function searchInDB(id, value, stage, isFinished, ctx) {

  let userec = User.findOne({'id': id}, function (err, user) {
    if (err) {
      if(err.code == 11000) {
        return console.log('null here', null);
      }
      else {
        return console.log('error', null);
      }
    }
    if (!user) {
      let user = new User(
        {
          id: id,
          value: 0,
          stage: 0,
          isFinished: false
        }
      );
      user.save(function (err) {
        if (err) {
          return next(err);
        }
        console.log('saved if no user found')
      });
    } else {
      // console.log(user)
      value = user.value;
      stage = user.stage;
      isFinished = user.isFinished;
      console.log('searchInDB', value, stage, isFinished)
    }      
  });

  userec.then(result => {
    console.log('search promise result', result)
    countAndSave(id, value, stage, isFinished, ctx);
  }, error => {
    console.log('error', error)
  });

  // fix nodejs
  process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
    // Recommended: send the information to sentry.io
    // or whatever crash reporting service you use
  });

} 

function saveToDB(id, value, stage, isFinished, ctx) {
  console.log('saveToDB start')
  console.log(id, value, stage, isFinished)

  let userec = User.findOne({'id': id}, function (err, user) {
    if (err) {
      if(err.code == 11000) {
        return console.log('null here', null);
      }
      else {
        return console.log('error', null);
      }
    }
    if (!user) {
      let user = new User(
        {
          id: id,
          value: value,
          stage: stage,
          isFinished: isFinished
        }
      );
      user.save(function (err) {
        if (err) {
          return next(err);
        }
        console.log('saved existed user')
      });
    } else {
      console.log('saveToDB', value, stage, isFinished)
      user.value = value;
      user.stage = stage;
      user.isFinished = isFinished;
      user.save(function (err) {
          if(err) {
              console.error('ERROR!');
          }
      });
      // console.log(user)
    }      
  });

  userec.then(result => {
    console.log('save promise result', result)
    // current question object
    let curStage = questObj[stage];

    ctx.reply(curStage.question, null, Markup
      .keyboard([
        [
          Markup.button(curStage.answers.answer1.text, 'primary', 10),
          Markup.button(curStage.answers.answer2.text, 'primary', 20),
          Markup.button(curStage.answers.answer3.text, 'primary', 40) 
        ]
      ])
      .oneTime());
  }, error => {
    console.log('error', error)
  });

  // fix nodejs
  process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
    // Recommended: send the information to sentry.io
    // or whatever crash reporting service you use
  });

}
