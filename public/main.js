// selector
let userInput = document.querySelector(".userInput");
let stockInput = document.querySelector("#stockInput");
let minValueInput = document.querySelector("#minValueInput");
let maxValueInput = document.querySelector("#maxValueInput");
let addBtn = document.querySelector(".addBtn");
let stockTable = document.querySelector("#stocks");
let errorP = document.querySelector(".errorInput");

// addEventListener
userInput.addEventListener("keypress", addStockOnEnter);
addBtn.addEventListener("click", checkInput)
stockTable.addEventListener("click", deleteStock);

// setInterval(getData, 3000);
// function getData(){
//     console.log("data added!")
//     let xhr = new XMLHttpRequest();
//     xhr.open("GET", '/dataFromDatabase', true);
//     xhr.send();
//     xhr.onload = function(){
//         console.log(xhr.response);
//     }
// };
function checkInput(e){
    console.log("test");
    console.log(maxValueInput.value);
    console.log(minValueInput.value);
    if (Number.parseFloat(maxValueInput.value) < Number.parseFloat(minValueInput.value)){
        e.preventDefault();
        console.log("run");
        errorP.style.display = "block";  
        errorP.innerText = "Error: The minimum value is less than maximum value!!"; 
        return false;
    }
    return true;
}

function addStockOnEnter(e){
    // e.preventDefault();
   if (e.code === 'Enter'){
       let inputCheck = checkInput();
       if (inputCheck){
        let xhr = new XMLHttpRequest();
        xhr.open('POST', '/addStock', true);
        xhr.send();
       }
   }
}

function deleteStock(e){
    if (e.target.className === "deleteBtn"){
        let stockName = e.target.parentElement.parentElement.getElementsByTagName("td")[0].innerText;
        let minValue = e.target.parentElement.parentElement.getElementsByTagName("td")[5].innerText;
        let maxValue = e.target.parentElement.parentElement.getElementsByTagName("td")[6].innerText;
        e.target.parentElement.parentElement.remove();
        console.log(stockName + " " + minValue + " " + maxValue);
        let removeData = {stockName, minValue, maxValue};
        let xhr = new XMLHttpRequest();
        xhr.open('POST', '/removeStock', true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.send(JSON.stringify(removeData));
    }
}
