// dependecies
const request = require("request-promise");
const cheerio = require("cheerio");
const express = require("express");
const bodyParser = require('body-parser');
var mongoose = require('mongoose');
// const webData = require('./webdata.js')
const cors = require('cors');

// starting server and using all necessary tools
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(cors({origin: '*'}))
// css and js is in public folder
app.use(express.static('public'));
// the view engine is ejs
app.set("view engine", "ejs");


// connecting to the database
var mongoDB = 'mongodb+srv://stock_database_user:GjXCFDZzd9OKNGcn@cluster0.eeevv.mongodb.net/stockDB?retryWrites=true&w=majority';
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
    }
})
// compile model from schema
var stockModel = mongoose.model('stockModel', stockModelSchema);

// setInterval(continuouslyUpdate, 10000);
// continuouslyUpdate();

// post and get functions
app.get('/', async function(req, res){
    // get data from the database
    console.log("get called");
    let allStocks;
    await stockModel.find({}, function(err, stocks){
        if (err){
            console.log("Error reading the data..");
            console.log(err);
        }
        else{
            allStocks = stocks;
        }
    })
    // render "index.ejs"
    res.render('index.ejs', {allStocks: allStocks});
})

app.get('/dataFromDatabase', async function(req, res){
    let allStocks = await getDataForCurrentUser();
    res.send(allStocks);
})

app.post('/addStock', async function(req, res){
    // get information regarding the stock
    if (Number.parseFloat(req.body.max_value) > Number.parseFloat(req.body.min_value)){
        let data = await getData(req.body.stock)
        // create an instance of model stockModel
        let stock_instance = new stockModel({
            emailAddress: "admin@admin.com",
            stockName: req.body.stock,
            companyName: req.body.stock,
            price: data[0].price,
            change: data[0].change,
            volume: data[0].volume,
            min_value: Number.parseFloat(req.body.min_value),
            max_value: Number.parseFloat(req.body.max_value)
        })
        // save the new model instance in the database
        await stock_instance.save(function(err, stock){
            if (err){
                console.log("Something went wrong!!");
            }
            else{
                console.log("stock added!");
                console.log(stock);
            }
        })
    }
    // redirect to main page
    console.log("redirected!");
    res.redirect('/')
})

app.post('/removeStock', async function(req, res){
    let removeData = JSON.parse(Object.keys(req.body));
    await stockModel.findOneAndDelete({stockName: removeData.stockName, min_value: Number.parseFloat(removeData.minValue), max_value: Number.parseFloat(removeData.maxValue)}, function(err, stock){
        if (err){
            console.log("Error finding the stock to remove");
            console.log(err);
        }
        else{
            console.log("Find and remove successful");
            console.log(stock)
        }
    })
})

app.get('/login', function(req, res){
    res.render('login.ejs');
})

app.get('/signup', function(req, res){
    res.render('signup.ejs')
})

app.listen(3000, function(){
    console.log("Server has started!!");    
});

async function continuouslyUpdate(){
    await stockModel.find({}, (err, stock)=>{
        if (err){
            console.log("Error in continuously finding data");
            console.log(err);
        }
        else{
            stock.forEach(async (s)=>{
                let data = await getData(s.stockName);
                if (s.price !== Number.parseFloat(data[0].price)){
                    // update the instance in the database
                    stockModel.updateMany({stockName: s.stockName}, {$set: {price: data[0].price, change: data[0].change, volume: data[0].volume}}, function(err, stock){
                        if (err){
                            console.log("error updating stock values");
                            console.log(err);
                        }
                        else{
                            console.log("values updated!");
                            console.log(stock);
                        }
                    })
                }
                console.log("No change Found!");
            })
        }
    })
}

async function getDataForCurrentUser(){
    let allStocks;
    await stockModel.find({}, function(err, stocks){
        if (err){
            console.log("Error reading the data..");
            console.log(err);
        }
        else{
            allStocks = stocks;
        }
    })
    return allStocks;
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
        let price = $('div[class="D(ib) Mend(20px)"] > span:nth-child(1)').text();
        let change =$('div[class="D(ib) Mend(20px)"] > span:nth-child(2)').text();
        change = change.slice(0, change.indexOf(' '));
        let volume = $('table[class="W(100%)"] >tbody > tr:nth-child(7) > td:nth-child(2)').text();
    
        stockData.push({
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