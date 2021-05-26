

/* Global Variables */
const baseUrl = 'http://api.openweathermap.org/data/2.5/weather?zip=';
const apikey = '&appid=66de3baec29a5246aadb9394ea613c5e';
// Create a new date instance dynamically with JS
let d = new Date();
let newDate = d.getMonth() + 1 + '.' + d.getDate() + '.' + d.getFullYear();


document.getElementById('generate').addEventListener('click', preformAction);


// 
function preformAction(e) {

    const zipcode = document.getElementById('zip').value;
    const theFeeling = document.getElementById('feelings').value;
    const country = document.getElementById('country').value;

    getZipWeather(baseUrl, zipcode, country, apikey)

        .then(function (data) {

            console.log(data);
            //calling the function to post data 
            postData('/add', {
                date: newDate,
                temp: data.main.temp,
                content: theFeeling
            });
            //to update ui after getting data
            upDateUi();
        })
};
//  function to get data from web api 

const getZipWeather = async (baseURL, zip, country, key) => {
    const res = await fetch(baseURL + zip + "," + country + key)
    try {
        const data = await res.json();
        console.log(data);
        return data;
    } catch (E) {
        //to handle any error
        console.log('error', E);

    }
}

//Function to POst data
const postData = async (url = '', data = {}) => {
    console.log(data);
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(data)//to create json string from a js object

    });
    try {
        const newData = await response.json();
        console.log(newData);
        return newData;
    }
    catch (E) {
        console.log('error', E);
    }

}
const datefield = document.getElementById('date');
const tempfield = document.getElementById('temp');
const contentfield = document.getElementById('content');

//function To update UI after getting data
const upDateUi = async () => {

    const request = await fetch('/all');
    try {
        const SavedData = await request.json();
        console.log(SavedData)
        datefield.innerHTML = `Date :${SavedData.date}`;
        tempfield.innerHTML = `Temperature :${SavedData.temp}`;
        contentfield.innerHTML = `I am felling  :${SavedData.content}`;

    } catch (E) {
        console.log('error', E);
    }
}