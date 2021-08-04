'use strict';

var url = "";
var sheetID = "";
var schedule = [];
var actionItems = [];
var emailList = [];

// trying to work around the getUserMedia bug
// chrome.runtime.onInstalled.addListener(checkAudioPermission());

// listen for confirmation of schedule spreadsheet url from content script
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
            "from:" + sender.tab.url :
            "from the extension");
        // if active tab is spreadsheet with meeting agenda/schedule
        if (request.greeting === "contentScript") {
            console.log(request.greeting);
            sendResponse({farewell: "goodbye"});
            // get url
            url = sender.tab.url;
            // get sheet ID
            sheetID = getSheetID(url)
            // get an OAuth2 access token using the client ID & read schedule off spreadsheet
            chrome.identity.getAuthToken({ 'interactive': true }, getSpreadsheet);
        // saving action items to spreadsheet
        } else if (request.greeting === "actionItemsFromPopup") {
            // HANDLE THE ARRAY OF ITEMS
            actionItems = request.actionItems;
            console.log("received " + actionItems);
            chrome.identity.getAuthToken({ 'interactive': true }, writeToSpreadsheet);
        // popup requests emails from spreadsheet
        } else if (request.greeting === "emails") {
            chrome.identity.getAuthToken({ 'interactive': true }, getEmails);
            sendResponse({farewell: "retrieving emails"});
        // popup requests filling in the new spreadsheet
        } else if (request.greeting === "makeNewSheet") {
            console.log(request.greeting);
            sendResponse({farewell: "making sheet"});
            // get url from active tab
            // wait for url to load?
            document.addEventListener("DOMContentLoaded", function(event) {
                console.log("I successfully waited for DOM to load. Supposedly.");
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    console.log(tabs[0].id);
                    url = tabs[0].pendingURL;
                });
                // this part isn't working because url doesn't resolve fast enough
                // get sheet ID
                sheetID = getSheetID(url)
                // get OAuth2 access token, callback to fill in new spreadsheet
                chrome.identity.getAuthToken({ 'interactive': true }, createSpreadsheet);
            });
        }
        return true;
});

// hardcoded url for testing
// url = 'https://docs.google.com/spreadsheets/d/1O8OCZKm_pbiOtzqIoMKYk-t8TeY0hfXdModUkbqiMME/edit/diadslkfaj'

function getSheetID(url) {
    var urlSheetID = url.replace(/(.*)docs.google.com\/spreadsheets\/d\//, '');
    urlSheetID = urlSheetID.replace(/\/edit(.*)/, '');
    console.log('sheetID = ', urlSheetID);
    return urlSheetID;
}

// fetch/get schedule from spreadsheet and populate schedule array
function getSpreadsheet(token) {
    console.log('this is the token: ', token);
    let init = {
        method: 'GET',
        async: true,
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        'contentType': 'json'
    };
    // fetch('https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}', init)
    // build url to access spreadsheet
    var fetchURL = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheetID + '/values/A1:B';
    fetch(fetchURL, init) // make init global if you want to separate fetch into separate function
        .then((response) => response.json())
        .then(function(data) {
            console.log(data);
            // clear schedule before loading
            schedule = [];
            for (const row of data.values) {
                // populate schedule array
                schedule.push(row);
            }
            console.log(schedule);
            if (checkSpreadsheet(schedule)) {
                // send spreadsheet to popup
                sendSchedule(schedule);
            } else {
                sendSchedule([]);
            }
        });
}

function writeToSpreadsheet(token) {
    var params = {
        'values': actionItems
    };
    console.log('this is the token: ', token);
    let init = {
        method: 'PUT',
        async: true,
        body: JSON.stringify(params),
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        'contentType': 'json'
    };
    fetch('https://sheets.googleapis.com/v4/spreadsheets/' + sheetID + '/values/D2:D?valueInputOption=USER_ENTERED', init)
    .then((response) => response.json())
    .then(function(data) {
        console.log(data);
        //Returns spreadsheet ID, update tange, cols and rows
    });
}

function getEmails(token){
    console.log('this is the token: ', token);
    let init = {
        method: 'GET',
        async: true,
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        'contentType': 'json'
    };
    // build url to access spreadsheet
    var fetchURL = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheetID + '/values/F2:F';
    fetch(fetchURL, init) // make init global if you want to separate fetch into separate function
        .then((response) => response.json())
        .then(function(data) {
            console.log(data);
            // clear email array before loading
            emailList = [];
            if (data.values) {
                for (const row of data.values) {
                    // populate schedule array
                    emailList.push(row);
                }
            }            
            console.log(emailList);
            sendEmails(emailList);
        });
    
}

function sendEmails(emailArray) {
    console.log("sending emails to popup");
    chrome.runtime.sendMessage({greeting: "emailList", array: emailArray}, function(response) {
        if (chrome.runtime.lastError) {
            console.log("There's a chrome runtime error: " + chrome.runtime.lastError);
        } else {
            console.log(response.farewell);
            return true;
        }
    });
}

// to create new meeting schedule google sheet
// this is too slow (URL resolves too slowly)
function createSpreadsheet(token){
    console.log('this is the token: ', token);
    // let init = ({
    //     method: 'POST',
    //     asung: true,
    //     url: 'https://sheets.googleapis.com/v4/spreadsheets',
    //     headers:{
    //       Authorization: 'Bearer ' + token,
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       properties: {
    //         title: "Meeting Agenda"
    //       }
    //     })}, (error, response, body)=>{
    //         if(!error && response.statusCode == 200){
    //           var info = JSON.parse(body);
    //           console.log(info);
    //         } else {
    //           console.log(error);
    //         }
    //       })
    var params = {
        'values': [
            ['Topic','Time (min)', '', 'Action Items'],
        ]
    };
    let init = {
        method: 'PUT',
        async: true,
        body: JSON.stringify(params),
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        'contentType': 'json'
    };
    // what is the url for the new sheet?
    fetch('https://sheets.googleapis.com/v4/spreadsheets/' + sheetID + '/values/A1:D1valueInputOption=USER_ENTERED', init)
    .then((response) => response.json())
    .then(function(data) {
        console.log(data);
        //Returns spreadsheet ID, update tange, cols and rows
    });
}

// check if spreadsheet is in correct format
// correct format is two columns, first row contains "Topic" and "Time (min)" in cells A1 and B1
function checkSpreadsheet(scheduleArray) {
    if (!schedule || !schedule.length) {
        console.log("Schedule array not populated.");
        return false;
    } else if (scheduleArray[0].length != 2) {
        console.log("Spreadsheet is in wrong format. Need 2 columns.");
        return false;
    } else if (!(scheduleArray[0][0] === "Topic") || !(scheduleArray[0][1] === "Time (min)")) {
        console.log("Spreadsheet headers incorrect. Possibly not a meeting schedule.");
        return false;
    } else {
        console.log("Spreadsheet appears to be in correct format.")
        return true;
    }
}

// sends schedule read from spreadsheet to popup script
function sendSchedule(scheduleArray) {
    console.log("sending schedule to popup");
    chrome.runtime.sendMessage({greeting: "background", array: scheduleArray}, function(response) {
        if (chrome.runtime.lastError) {
            console.log("There's a chrome runtime error: " + chrome.runtime.lastError);
        } else {
            console.log(response.farewell);
            return true;
        }
    });
}

// check for microphone permission
// function checkAudioPermission() {
//     chrome.tabs.executeScript({
//         file: 'permission.js'
//     });
// }