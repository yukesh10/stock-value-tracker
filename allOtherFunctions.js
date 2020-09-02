// all the function
const nodemailer = require('nodemailer')
const webScraping = require('./webScraping.js')
async function continuouslyUpdate(stockModel){
    let allStocks = await stockModel.find({}, (err, stock)=>{
        if (err){
            console.log("Error in continuously finding data");
            console.log(err);
        }
        else{
            stock.forEach(async (s)=>{
                let data = await webScraping.getData(s.stockName);
                if (s.price !== Number.parseFloat(data[0].price)){
                    // update the instance in the database
                    let updatedStock = await stockModel.updateMany({stockName: s.stockName}, {$set: {price: data[0].price, change: data[0].change, volume: data[0].volume}});
                    let checkStock = await stockModel.find({stockName: s.stockName});
                    checkStock.forEach(async (stock) => {
                        // console.log(stock.price, stock.min_value, stock.max_value, stock.sendEmail)
                        if ((stock.price < stock.min_value || stock.price > stock.max_value) && stock.sendEmail === false){
                            let emailSentStock = await stockModel.findOneAndUpdate({stockName: stock.stockName, emailAddress: stock.emailAddress}, {$set: {sendEmail: true}});
                            let emailSent = await sendEmail(stock.emailAddress, stock.stockName, stock.price);
                            console.log(emailSent);
                        }
                        else if (stock.price > stock.min_value && stock.price < stock.max_value && stock.sendEmail === true){
                            let emailSentStock = await stockModel.findOneAndUpdate({stockName: stock.stockName, emailAddress: stock.emailAddress}, {$set: {sendEmail: false}});
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

async function getDataForCurrentUser(user, stockModel){
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
            pass: process.env.PASSWORD
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

module.exports = {continuouslyUpdate, getDataForCurrentUser, checkAuthenticated, checkNotAuthenticated, sendEmail}