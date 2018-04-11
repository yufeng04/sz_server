var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var notes = require('./routes/notes');
var propertySeq=require('./routes/propertySeq');
var crm=require('./routes/crm');
var ticket=require('./routes/ticket');
var weblog=require('./routes/weblog');
var message=require('./routes/message');
var loginfo=require('./routes/loginfo');
var events=require('./routes/events');
var client=require('./routes/client');
var headimage = require('./routes/headimage');
var szgjj = require('./routes/szgjj');
var handleSzgjjData = require('./routes/handleSzgjjData');
var handleData166 = require('./routes/handleData166');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/notes', notes);
app.use('/propertySeq',propertySeq);
app.use('/crm',crm);
app.use('/tickets',ticket);
app.use('/weblog',weblog);
app.use('/message',message);
app.use('/loginfo',loginfo);
app.use('/event',events);
app.use('/client',client);
app.use('/headimage',headimage);
app.use('/szgjj',szgjj);
app.use('/handleSzgjjData',handleSzgjjData);
app.use('/handleData166',handleData166);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
