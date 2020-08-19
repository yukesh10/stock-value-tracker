if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

// dependecies
const request = require("request-promise");
const cheerio = require("cheerio");
const express = require("express");
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
var mongoose = require('mongoose');
// const webData = require('./webdata.js')
const cors = require('cors');
const bcrypt = require('bcrypt');
const passport = require('passport');
const nodemailer = require('nodemailer')

const initializePassword = require('./password-config');
initializePassword(passport, 
    async (email) => {
    let user = await userModel.find({emailAddress: email})
    return user
}, 
async (id) => {
    let user = await userModel.find({_id: id})
    return user
});

const livereload = require("livereload");
var connectLivereload = require("connect-livereload");
const flash = require('express-flash');
const session = require('express-session');

var liveReloadServer = livereload.createServer();
liveReloadServer.watch('public');

// starting server and using all necessary tools
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(cors({origin: '*'}))
app.use(connectLivereload());
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
// the view engine is ejs
app.set("view engine", "ejs");


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

setInterval(continuouslyUpdate, 10000);
// continuouslyUpdate();

// post and get functions
app.get('/', checkAuthenticated, async function(req, res){
    // get data from the database
    console.log("get called");
    console.log(req.user[0].emailAddress)
    let allStocks = await stockModel.find({emailAddress: req.user[0].emailAddress});
    console.log(allStocks)
    // render "index.ejs"
    res.render('index.ejs', {allStocks: allStocks});
})

app.get('/dataFromDatabase', checkAuthenticated, async function(req, res){
    let allStocks = await getDataForCurrentUser(req.user[0].emailAddress);
    res.send(allStocks);
})

app.post('/addStock', checkAuthenticated, async function(req, res){
    // get information regarding the stock
    if (Number.parseFloat(req.body.max_value) > Number.parseFloat(req.body.min_value)){
        let data = await getData(req.body.stock)
        console.log(req.user);
        if (data[0].price !== ''){
            let stock_instance = new stockModel({
                emailAddress: req.user[0].emailAddress,
                stockName: req.body.stock,
                companyName: data[0].companyName,
                price: data[0].price,
                change: data[0].change,
                volume: data[0].volume,
                min_value: Number.parseFloat(req.body.min_value),
                max_value: Number.parseFloat(req.body.max_value),
                sendEmail: false
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

app.post('/removeStock', checkAuthenticated, async function(req, res){
    let removeData = JSON.parse(Object.keys(req.body));
    let removedStock = await stockModel.findOneAndDelete({emailAddress: req.user[0].emailAddress, stockName: removeData.stockName, min_value: Number.parseFloat(removeData.minValue), max_value: Number.parseFloat(removeData.maxValue)})
    console.log(removedStock)
})

app.get('/login', checkNotAuthenticated, function(req, res){
    res.render('login.ejs', {error: false});
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/signup', checkNotAuthenticated, function(req, res){
    res.render('signup.ejs', {error: false})
})

app.post('/signup', checkNotAuthenticated, async function(req, res){
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

app.listen(3000, function(){
    console.log("Server has started!!");    
});

async function continuouslyUpdate(){
    let allStocks = await stockModel.find({}, (err, stock)=>{
        if (err){
            console.log("Error in continuously finding data");
            console.log(err);
        }
        else{
            stock.forEach(async (s)=>{
                let data = await getData(s.stockName);
                if (s.price !== Number.parseFloat(data[0].price)){
                    // update the instance in the database
                    let updatedStock = await stockModel.updateMany({stockName: s.stockName}, {$set: {price: data[0].price, change: data[0].change, volume: data[0].volume}});
                    let checkStock = await stockModel.find({stockName: s.stockName});
                    checkStock.forEach(async (stock) => {
                        if ((stock.price < stock.min_value || stock.price > stock.max_value) && stock.sendEmail === false){
                            let emailSentStock = await stockModel.findOneAndUpdate({stockName: stock.stockName, emailAddress: stock.emailAddress}, {$set: {sendEmail: true}});
                            let emailSent = sendEmail(stock.emailAddress, stock.stockName, stock.price);
                            console.log(emailSent);
                        }
                    })
                }
                else{
                    // console.log("not updated!");
                }
            })
        }
    })
}

async function getDataForCurrentUser(user){
    let allStocks= await stockModel.find({emailAddress: user});
    return allStocks;
}

function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return next()
    }
    res.redirect('login');
}

function checkNotAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        res.redirect('/');
    }
    next()
}

async function sendEmail(emailAddress, stockName, currentPrice){
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.end.PASSWORD
        }
    });

    let mailOptions = {
        from: 'Stock Value Tracker',
        to: emailAddress,
        subject: 'Stock value has gone beyond the set limit',
        text: `Hello ${emailAddress},
            The ${stockName} has is currently $${currentPrice}.
            - Stock Value Tracker`
    } 

    transporter.sendMail(mailOptions, function(error, info){
        if (error){
            console.log(error)
        } else{
            console.log("Email sent: " + info.response);
        }
    })
}

// This is all webscripting codes
async function getData(stockName){
    // console.log("requesting again");
    const stockURL= `https://finance.yahoo.com/quote/${stockName}?p=${stockName}&.tsrc=fin-srch`;
    let stockData = []
    try{
        const response = await request({
            uri: stockURL,
            headers: {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en-GB,en;q=0.9,en-US;q=0.8,ml;q=0.7",
                "cache-control": "max-age=0",
                "dnt": "1",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36"
            },
            gzip: true
        });
    
        let $ = cheerio.load(response);
        let companyName = $('div[class="D(ib) "] > h1').text()
        let price = $('div[class="D(ib) Mend(20px)"] > span:nth-child(1)').text();
        let change =$('div[class="D(ib) Mend(20px)"] > span:nth-child(2)').text();
        change = change.slice(0, change.indexOf(' '));
        companyName = companyName.slice(0, companyName.indexOf('('))
        let volume = $('table[class="W(100%)"] >tbody > tr:nth-child(7) > td:nth-child(2)').text();
        stockData.push({
            companyName,
            price,
            change,
            volume
        });
    }
    catch(error){
        console.log(error);
    }
    return stockData;
};