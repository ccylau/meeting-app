'use strict';

var addTime = document.getElementById("minutesToAdd");
var voiceControlOn = document.getElementById("voiceToggle");
var startPhrase = document.getElementById("startPhrase");
var endPhrase = document.getElementById("endPhrase");
var timerModeOn = document.getElementById("timerMode");

// restore options on load
document.addEventListener('DOMContentLoaded', restoreOptions);

// listen for changes to options
addTime.addEventListener('change', function(e) {
    if (!e.target.value) {
        console.log("New time: .1s");
        addTime.value = .1;
    } else {
        console.log("New time: " + addTime.value)
        addTime.value = e.target.value;
    }    
    saveOptions();
});
voiceControlOn.addEventListener('change', function() {
    console.log("Voice control: " + voiceControlOn.checked);
    saveOptions();
});
timerModeOn.addEventListener('change', function() {
    console.log("Automatically end discussion sections: " + timerModeOn.checked);
    saveOptions();
});
startPhrase.addEventListener('change', function(e) {
    if (!e.target.value) {
        console.log("Invalid phrase.");
        startPhrase.value = "action item";
    } else {
        console.log("New start phrase: " + startPhrase.value)
        startPhrase.value = e.target.value;
    }    
    saveOptions();
});
endPhrase.addEventListener('change', function(e) {
    if (!e.target.value) {
        console.log("Invalid phrase.");
        endPhrase.value = "save item";
    } else {
        console.log("New end phrase: " + endPhrase.value)
        endPhrase.value = e.target.value;
    }    
    saveOptions();
})

// save option variables to storage
function saveOptions() {
    chrome.storage.sync.set({
        minutes: addTime.value,
        voiceControl: voiceControlOn.checked,
        timerMode: timerModeOn.checked,
        start: startPhrase.value,
        stop: endPhrase.value,
      }, function() {
          console.log("Settings saved");
      });
}

// restores minutes and voice control checkbox state using the preferences stored in chrome.storage.
// also sets defaults if no values available
function restoreOptions() {
    chrome.storage.sync.get(['minutes', 'voiceControl', 'timerMode', 'start', 'stop'], function(items) {
        if (!items.minutes) {
            addTime.value = .1;
        } else {
            addTime.value = items.minutes;
        }    
        voiceControlOn.checked = items.voiceControl;
        timerModeOn.checked = items.timerMode;
        if (!items.start) {
            startPhrase.value = "action item";
        } else {
            startPhrase.value = items.start;
        }
        if (!items.stop) {
            endPhrase.value = "save item";
        } else {
            endPhrase.value = items.stop;
        }
    });
}

// document.getElementById('save').addEventListener('click',
//     save_options);