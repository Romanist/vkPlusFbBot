const express = require('express');
const bodyParser = require('body-parser');
const VkBot = require('./lib');
const Markup = require('./lib/markup');
const questObj = require('./questions');
const Session = require('./lib/session');
const Scene = require('./lib/scene');
const Stage = require('./lib/stage');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const app = express();
let mongoDB = 'mongodb://someuser:abcd1234@ds163694.mlab.com:63694/productstutorial';
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
let db = mongoose.connection;

let UserSchema = new Schema({
    id: {type: String, required: true, max: 30},
    value: {type: Number, required: true},
    step: {type: Number, required: true},
    isFinished: {type: Boolean, required: true}
});
let User = mongoose.model('User', UserSchema);

const bot = new VkBot({
  token: 'f6f4f511b58e60eead7622ec875a7036ba82058346d3736a18c3c717f88a0d72667c7057c3e4ea6c492cd',
  confirmation: 'd588faa9'
});

let isFinished = false;

const scene = new Scene('meet',
  (ctx) => {
    stepUp(ctx);
  },
  (ctx) => {
    stepUp(ctx);
  },
  (ctx) => {
    stepUp(ctx);
  },
  (ctx) => {
    stepUp(ctx);
  },
  (ctx) => {
    stepUp(ctx);
  },
  (ctx) => {
    stepUp(ctx);
  },
  (ctx) => {
    ctx.scene.leave()
  }
)

async function stepUp(ctx) {
  let step = ctx.session.step ? ctx.session.step : 0;
  let value = Number(ctx.session.value) ? Number(ctx.session.value) : 0;
  let curValue = Number(ctx.message.payload) ? Number(ctx.message.payload) : 0;
  value = Number(value) + Number(curValue);
  ctx.session.value = value;

  let curStep = questObj[step];

  ctx.reply(curStep.question, null, Markup
    .keyboard([
      [
        Markup.button(curStep.answers.answer1.text, 'primary', 10),
        Markup.button(curStep.answers.answer2.text, 'primary', 20),
        Markup.button(curStep.answers.answer3.text, 'primary', 40) 
      ]
    ])
    .oneTime());
  step++;
  ctx.session.step = step;

  saveToDB(ctx, step, value)
}

async function saveToDB(ctx, step, value) {
  let contextScene = ctx.scene;
  let id = ctx.message.from_id;
  let promise = User.findOne({'id': id}, function (err, user) {
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
          step: step,
          isFinished: isFinished
        }
      );
      user.save(function (err) {
        if (err) {
          return next(err);
        }
      });
    } else {
      user.value = value;
      user.step = step;
      user.isFinished = isFinished;
      user.save(function (err) {
          if(err) {
              console.error('ERROR!', err);
          }
      });
      // console.log(user)
    }
  }).exec();
  promise.then(ctx => {
    console.log('PROMISERETURN ONSAVE')
    // stepUp(ctx)
    contextScene.next()
  }, err => {
    console.log('err', err)
  });
}

async function checkDB(ctx) {
  let id = ctx.message.from_id;
  let value;
  let step;
  let isFinished;
  let contextScene = ctx.scene;

  let promise = User.findOne({'id': id}, async function (err, user) {
    if (err) {
      if(err.code == 11000) {
        return console.log('null here', null);
      }
      else {
        return console.log('error', null);
      }
    }
    if (!user) {
      try {
        let user = new User(
          {
            id: id,
            value: 0,
            step: 0,
            isFinished: false
          }
        );
        let saveUser = await user.save(function (err) {
          if (err) {
            return next(err);
          }
        });
        await saveUser;
      } catch (err) {
        console.log('err', err)
      }
    } else {
      // console.log(user)
      // value = user.value;
      // step = user.step;
      // isFinished = user.isFinished;
      // console.log(' ')
      // console.log('searchInDB', value, step, isFinished)
      // console.log(' ')
    }      
  }).exec();
  promise.then(ctx => {
    console.log('PROMISERETURN on checkDB')
    // stepUp(ctx)
    contextScene.enter('meet')
  }, err => {
    console.log('err', err)
  });
}

const session = new Session()
const stage = new Stage(scene)

bot.use(session.middleware())
bot.use(stage.middleware())

bot.on((ctx) => {
  console.log(' ')
  console.log('_____________________________________')
  console.log(' ')
  checkDB(ctx);
  // ctx.scene.enter('meet')
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post('/', bot.webhookCallback);

app.listen(80);