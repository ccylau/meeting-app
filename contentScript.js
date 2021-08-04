'use strict';

// listen for popup to verify tab is on spreadsheet
// listen for schedule array from background script
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("receiving message from popup");
        if (request.greeting === "askForSpreadsheet") {
            sendResponse({farewell: "goodbye"});
            // let background know we are on the correct url (google spreadsheet)
            console.log("sending message to background");
            chrome.runtime.sendMessage({greeting: "contentScript"}, function(response) {
                console.log(response.farewell);
            });
        }
});