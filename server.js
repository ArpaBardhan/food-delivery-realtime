require('dotenv').config()
const express = require('express')
const app = express()
const ejs = require('ejs')
const path = require('path')
const expressLayout = require('express-ejs-layouts')
const PORT = process.env.PORT || 3800
const mongoose = require('mongoose')
const session = require('express-session')
const flash = require('express-flash')
const MongoDbStore = require('connect-mongo').default; //first letter caps meaning class or function
var passport = require('passport');
const Emitter = require('events')



//Database connection
const url = "mongodb+srv://admin:admin123@cluster0.mflbt.mongodb.net/pizza?retryWrites=true&w=majority";
mongoose.connect(url, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: true });
const connection = mongoose.connection;
connection.once('open', () => {
    console.log('Database connected...');
}).catch(err => {
    console.log('Connection failed...')
});
//Session store
const mongoStore = MongoDbStore.create({
    mongoUrl: url,
    collection: "sessions",
});
// Event emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)

//session config
app.use(
    session({
        secret: process.env.COOKIE_SECRET,
        resave: false,
        store: mongoStore,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 24 }, //cookie valid for 1 hours
    })
);

//passport config
require('./app/config/passport')(passport)
app.use(passport.initialize())
app.use(passport.session())

app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//Global middleware 
//for sending data to frontend by #session.totalQty in cart
app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
});

//set template Engine
app.use(expressLayout);
app.set('views', path.join(__dirname, '/resources/views/'));
app.set('view engine', 'ejs')

require('./routes/web')(app);

const server = app.listen(PORT, () => {
        console.log(`Listening on port ${PORT} `);
    })
    // Socket
const io = require('socket.io')(server)
io.on('connection', (socket) => {
    // Join
    socket.on('join', (roomName) => {
        socket.join(roomName)
    })
})

eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data)
})

eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data)
})