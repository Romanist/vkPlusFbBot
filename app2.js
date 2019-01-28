const express = require('express');
const bodyParser = require('body-parser');
const VkBot = require('./lib');
const Markup = require('./lib/markup');
const questObj = require('./questions');
const Session = require('./lib/session');
const Scene = require('./lib/scene');
const Stage = require('./lib/stage');
const mongoose = require('mongoose');
const request = require('request-promise')
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
    first_name: {type: String},
    last_name: {type: String}
});
let User = mongoose.model('User', UserSchema);

const bot = new VkBot({
  token: 'f6f4f511b58e60eead7622ec875a7036ba82058346d3736a18c3c717f88a0d72667c7057c3e4ea6c492cd',
  confirmation: 'd588faa9'
});

let numbOfQuestions = questObj.length;

const scene = new Scene('meet',
  (ctx) => {
    ctx.session.step = 0;
    ctx.session.value = 0;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.session.step = 1;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.session.step = 2;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.session.step = 3;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.session.step = 4;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.session.step = 5;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.session.step = 6;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.session.step = 7;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.session.step = 8;
    stepUp(ctx);
  },
  (ctx) => {
    ctx.scene.leave();
  }
)

async function stepUp(ctx) {
  let step = ctx.session.step ? ctx.session.step : 0;
  let value = Number(ctx.session.value) ? Number(ctx.session.value) : 0;
  let curValue = Number(ctx.message.payload) ? Number(ctx.message.payload) : 0;
  value = Number(value) + Number(curValue);
  ctx.session.value = value;
  let curStepMin = questObj[step - 1];

  console.log(step)
  if ((!curValue) && (step > 0)) {
    // ctx.reply('To hit buttons only!\nTry Again\n');
    ctx.reply('To hit buttons only!\nTry Again\n\n' + curStepMin.question, null, Markup
      .keyboard([
        [
          Markup.button(curStepMin.answers.answer1.text, 'primary', 10),
          Markup.button(curStepMin.answers.answer2.text, 'primary', 20),
          Markup.button(curStepMin.answers.answer3.text, 'primary', 40) 
        ]
      ])
      .oneTime());
    // ctx.scene.enter('meet', [step])
    return false;
  }

  if (numbOfQuestions <= step) {
    ctx.reply('Your number of points is ' + value, null, Markup
    .keyboard([
      [
        Markup.button('начать заново', 'primary', 'renew')
      ]
    ])
    .oneTime());
    saveToDB(ctx, step, value)
    ctx.scene.leave()
    return false
  }

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

async function renew(ctx) {
  console.log('renew start!')
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
          value: 0,
          step: 0
        }
      );
      user.save(function (err) {
        if (err) {
          return next(err);
        }
      });
    } else {
      user.value = 0;
      user.step = 0;
      user.save(function (err) {
          if(err) {
              console.error('ERROR!', err);
          }
      });
    }
  }).exec();
  promise.then(ctx => {
    console.log('renewed')
    contextScene.enter('meet', [0])
  }, err => {
    console.log('err', err)
  });
}

async function saveToDB(ctx, step, value) {
  console.log('presave', step, value)
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
          step: step
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
      user.save(function (err) {
          if(err) {
              console.error('ERROR!', err);
          }
      });
    }
  }).exec();
  promise.then(ctx => {
    contextScene.next()
  }, err => {
    console.log('err', err)
  });
}

async function checkDB(ctx) {
  let id = ctx.message.from_id;
  let value;
  let step;
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
      console.log('noUSER')
      try {
        let user = new User(
          {
            id: id,
            value: 0,
            step: 0
          }
        );
        let options = {
          method: 'GET',
          uri: 'https://api.vk.com/method/users.get?user_id=' + id + '&v=5.52&access_token=f6f4f511b58e60eead7622ec875a7036ba82058346d3736a18c3c717f88a0d72667c7057c3e4ea6c492cd'
        }
        request(options)
          .then(async function (context) {
              user.first_name = context.response[0].first_name;
              user.last_name = context.response[0].last_name;
              let saveUser = await user.save(function (err) {
                if (err) {
                  return next(err);
                }
              });
              await saveUser;
          })
          .catch(function (err) {
              console.log('err ', err)
          })      
      } catch (err) {
        console.log('err', err)
      }
    }   
  }).exec();
  promise.then(ctx => {
    if (!ctx) {
      var curStep = 0
    } else curStep = ctx.step ? ctx.step : 0;
    if (curStep) {
      contextScene.enter('meet', [curStep])
    } else {
      contextScene.enter('meet')
    }    
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
  if ((ctx.message.payload == '"renew"')) {
    renew(ctx);
    return false;
  }
  checkDB(ctx);
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post('/', bot.webhookCallback);

app.listen(80);