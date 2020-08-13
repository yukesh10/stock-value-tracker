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
        let changePercentage = $('div[class="D(ib) Mend(20px)"] > span:nth-child(2)').text();
        let volume = $('table[class="W(100%)"] >tbody > tr:nth-child(7) > td:nth-child(2)').text();
    
        stockData.push({
            price,
            change,
            changePercentage,
            volume
        });
    }
    catch(error){
        console.log(error);
    }
    return stockData;
};