# stock-value-tracker

This website is created with the intention to learn the full stack web development with web scraping (Yahoo Finance)

Tools used:
1. Node.js to use JS for creating server
2. Express framework for backend development
3. MongoDB for storing data
4. Vanilla JS for front-end development
5. ejs to generate HTML markup with plain JS
6. cheerio for web scraping
7. Google Fonts for fonts 
8. nodemailer to send email

# How does this web application work?
-> First of all, you have to create a account. <br />
-> After you are logged in, you will be able to add stock, and specify the minimum and maximum value. <br />
-> The application will keep updating stock every 10 sec and if at any point, the price of the stock goes <strong> below the specified minimum value </strong> and <strong> above the specified maximum value </strong>, the application will email the user on the email address that is used to create an account. <br />
