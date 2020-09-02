if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

// dependecies
const express = require("express");
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
var mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('cookie-session');
const initializePassword = require('./password-config');
const webScraping = require('./webScraping.js');
const otherFunctions = require('./allOtherFunctions.js')

initializePassword(passport, 
    async (email) => {
    let user = await userModel.find({emailAddress: email})
    return user
});

// starting server and using all necessary tools
const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(cors({origin: '*'}))

// css and js is in public folder
app.use(express.static('public'));
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

// connecting to the database
var mongoDB = process.env.DATABASE;
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true }, ()=> {
    console.log("database connected!!");
});
// get default connection
var db = mongoose.connection;
// bind connection to error event
db.on('error', console.error.bind(console, 'MongoDB connection error: '));

var schema = mongoose.Schema;
// create a model
var stockModelSchema = new schema({
    emailAddress: String,
    stockName: String,
    companyName: String,
    price: Number,
    change: String,
    volume: String,
    max_value: {
        type: Number,
        min: 0,
        required: true
    },
    min_value: {
        type: Number,
        min: 0,
        required: true
    },
    sendEmail: Boolean
})

var userSchema = new schema({
    emailAddress: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

// compile model from schema
var stockModel = mongoose.model('stockModel', stockModelSchema);
var userModel = mongoose.model('userModel', userSchema);

setInterval(function(){otherFunctions.continuouslyUpdate(stockModel);}, 10000);

// post and get functions
app.get('/', otherFunctions.checkAuthenticated, async function(req, res){
    // get data from the database
    console.log("get called");
    console.log(req.user[0].emailAddress)
    let allStocks = await stockModel.find({emailAddress: req.user[0].emailAddress});
    console.log(allStocks)
    res.render('index.ejs', {allStocks: allStocks});
})

app.get('/dataFromDatabase', otherFunctions.checkAuthenticated, async function(req, res){
    let allStocks = await otherFunctions.getDataForCurrentUser(req.user[0].emailAddress, stockModel);
    res.send(allStocks);
})

app.post('/addStock', otherFunctions.checkAuthenticated, async function(req, res){
    // get information regarding the stock
    console.log("addStock called..")
    if (Number.parseFloat(req.body.max_value) > Number.parseFloat(req.body.min_value)){
        console.log("inside")
        let data = await webScraping.getData(req.body.stock)
        console.log("after")
        console.log("Data: " + data)
        if (data[0].price !== ''){
            let emailBoolean = false;
            if (data[0].price < Number.parseFloat(req.body.min_value) || data[0].price > Number.parseFloat(req.body.max_value)){
                let emailSent = await otherFunctions.sendEmail(req.user[0].emailAddress, req.body.stock, data[0].price);
                console.log(emailSent)
                emailBoolean = true;
            }
            let stock_instance = new stockModel({
                emailAddress: req.user[0].emailAddress,
                stockName: req.body.stock,
                companyName: data[0].companyName,
                price: data[0].price,
                change: data[0].change,
                volume: data[0].volume,
                min_value: Number.parseFloat(req.body.min_value),
                max_value: Number.parseFloat(req.body.max_value),
                sendEmail: emailBoolean
            })
            let addedStock = await stock_instance.save();
            console.log(addedStock);
        }
        console.log(data)
        // create an instance of model stockModel
        
    }
    // redirect to main page
    console.log("redirected!");
    res.redirect('/')
})

app.post('/removeStock', otherFunctions.checkAuthenticated, async function(req, res){
    let removeData = JSON.parse(Object.keys(req.body));
    let removedStock = await stockModel.findOneAndDelete({emailAddress: req.user[0].emailAddress, stockName: removeData.stockName, min_value: Number.parseFloat(removeData.minValue), max_value: Number.parseFloat(removeData.maxValue)})
    console.log(removedStock)
})

app.get('/login', otherFunctions.checkNotAuthenticated, function(req, res){
    res.render('login.ejs', {error: false});
})

app.post('/login', otherFunctions.checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/signup', otherFunctions.checkNotAuthenticated, function(req, res){
    res.render('signup.ejs', {error: false})
})

app.post('/signup', otherFunctions.checkNotAuthenticated, async function(req, res){
    try{
        if (req.body.password === req.body.verifypassword){
            const hashedPassword = await bcrypt.hash(req.body.password, 10); 
            let user_instance = new userModel({
                emailAddress: req.body.email,
                password: hashedPassword
            })
            let registeredUser = await user_instance.save();
            console.log(registeredUser);
            res.redirect('/login')
        }
        else{
            res.render('signup.ejs', {error: true});
        }
    }
    catch(err){
        console.log(err);
        res.register('/signup');
    }
    
})

app.delete('/logout', (req, res) => {
    req.logOut();
    res.redirect('/login');
})

app.listen(process.env.PORT || 3000, function(){
    console.log(`Server has started at port ${process.env.PORT}`);    
});