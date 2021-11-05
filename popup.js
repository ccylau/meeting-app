'use strict';
// speech recognition and synthesis stuff
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
// var SpeechSynthesis = SpeechSynthesis;
// var SpeechSynthesisUtterance = SpeechSynthesisUtterance;
// var SpeechSynthesisEvent = SpeechSynthesisEvent;

// initializing variables
var timeTable = [];
var popupTable = document.getElementById("tbody");
var timeOut;
var startTime;
var currentRow = 1; // start on first row, updates within discussionLoop
var countdown;
var timer;
var progressBar;

// popup.html elements
var popupSpreadsheetStuff = document.getElementById("onAgendaSpreadsheetStuff");
var popupHomePage = document.getElementById("homePage");
var startClockButton = document.getElementById("clockButton");
var addTimeButton = document.getElementById("addButton");
var skipTopicButton = document.getElementById("skipButton");
var createAgendaButton = document.getElementById("createAgendaButton");
var timeRemainingDisplay = document.getElementById("timeRemaining");
// status flags
var clockRunning = false;
var timerFinished = true;
// options
var addTime;
var voiceControlOn;
var startPhrase;
var endPhrase;
var timerModeOn;

// voice transcript variables
var recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
var final_transcript = "";
var recognizing = false;
// voice transcript html elements
var speechRecognitionButton = document.getElementById("listenButton");
var recordActionItemButton = document.getElementById("recordButton");
var actionItemList = document.getElementById("actionItems");
var emailButton = document.getElementById("emailButton");
var saveButton = document.getElementById("saveButton");
var actionItemArray = []; // may need to send a copy to background for persistence

// on open, ask content script if active tab is a spreadsheet
onSpreadsheet();

// also, get option settings
initializeOptions();

// listen for messages from background script
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log(sender.tab ?
      "from background:" + sender.tab.url :
      "from the extension");
    // schedule array from background
    if (request.greeting === "background") {
      timeTable = request.array;
      console.log(timeTable);
      sendResponse({ farewell: "goodbye" });
      // populate popup.html table!
      if (timeTable)
      populateTable(timeTable);
    } else if (request.greeting === "emailList") {
      var emails = request.array;
      console.log("received: " + emails)
      sendResponse({ farewell: "goodbye" });
      sendEmail(emails);
    }
    return true;
  }
);

/*
 * Time Management Section
 */

/**
 * Creates speechSynthesis object and speaks sayThisText
 * 
 * @param {string} sayThisText The text being 'spoken'
 */
function sayThis(sayThisText) {
  let v = new SpeechSynthesisUtterance();
  v.lang = 'en-US';
  v.rate = 1;
  v.text = sayThisText;
  speechSynthesis.speak(v);
}

// promisify setTimeout function
const delay = ms => new Promise(resolve => timeOut = setTimeout(resolve, ms));

/**
 * This is the main timer function, which loops through the entire timetable and counts down each topic.
 * Includes basic functions Start, Pause, AddTime, Resume, and Skip to control the timer.
 * Also calls the progress bar function that visualizes the timer.
 * 
 * @param {number} rowNum is the row that we want to start from on the timetable
 */
class Timer {
  constructor(rowNum) {
    var timeElapsed = 0;
    var row = rowNum;
    var timeRemaining;
    var timerOn = false;
    var progressBar;
    var startTime;
    var pauseTime;
    var addedTime = false;
    // addTime is the amount of time to add (set in options.html!)
    var addMinutes = addTime;
  
    this.start = async function() {
      // flag for start button
      timerFinished = false;

      if (timerModeOn){ // in auto-advance mode for timer
        // loop through timetable
        for (; row < timeTable.length; row++) {
          console.log("Row: " + row);
          currentRow = row;
          if (!timerOn) {
            startClockButton.value = "Pause timer";
            // welcome message on first start
            if (row == 1 && timeElapsed == 0) {
              sayThis("Welcome.");
            }      
            
            setTimerOn(true);          
            
            // if starting from beginning of topic
            if (timeElapsed == 0) {
              sayThis("Topic is " + timeTable[row][0]);
              timeRemaining = timeTable[row][1] * 60000;
              progressBar = new ProgressBar(timeTable[row][1] * 60, "bar" + row);
              progressBar.start();
            } else if (!addedTime) { // resuming from pause
              sayThis("Resuming " + timeTable[row][0]);
              // timeRemaining keeps value if resuming from pause
              progressBar.resume();
            } else {// resuming from adding time
              progressBar.resume();
              addedTime = false;
            }
            console.log("Wait for " + timeRemaining);
            
            // run();
            startTime = new Date();
            await delay(timeRemaining);
            sayThis("End of discussion.");
            progressBar.setWidth(100);
            progressBar = undefined;
            timeElapsed = 0;
            timerOn = false;   
          }  
        }
        clockRunning = false;
        timeOut = undefined;
        currentRow = 1;
        // reset after finishing loop through timetable
        startClockButton.value = "Start clock";
        row = 1;     
        timerFinished = true;
      } else { // not auto-advance, timer must wait for user input to move onto next topic
        // start at row
        console.log("Row: " + row);
        // if (row < timeTable.length) {
          if (!timerOn) {
            if (row < timeTable.length) {
              startClockButton.value = "Pause timer";
              // welcome message on first start
              if (row == 1 && timeElapsed == 0) {
                sayThis("Welcome.");
              }      
              
              setTimerOn(true);

              // if starting from beginning of topic
              if (timeElapsed == 0) {
                currentRow = row;
                sayThis("Topic is " + timeTable[row][0]);
                timeRemaining = timeTable[row][1] * 60000;
                progressBar = new ProgressBar(timeTable[row][1] * 60, "bar" + row);
                progressBar.start();
              } else if (!addedTime) { // resuming from pause
                sayThis("Resuming " + timeTable[row][0]);
                // timeRemaining keeps value if resuming from pause
                progressBar.resume();
              } else {// resuming from adding time
                progressBar.resume();
                addedTime = false;
              }

              startTime = new Date();
              await delay(timeRemaining);
              // sayThis("End of discussion.");
              progressBar.setWidth(100);
            } else {
              // reset after finishing loop through timetable

              clockRunning = false;
              timeOut = undefined;
              currentRow = 1;
              // reset after finishing loop through timetable
              startClockButton.value = "Start clock";
              row = 1;     
              timerFinished = true;
            }    
          }
        // }
      }
          
    }
    
    this.pause = function() {
      // pause timer, save elapsed time
      if (timerOn) {
        startClockButton.value = 'Resume timer';
        pauseTime = new Date();
        clearTimeout(timeOut);
        // timeElapsed will be subtracted from the total
        timeElapsed = timeElapsed + (pauseTime - startTime);
        console.log("Time elapsed: " + timeElapsed);
        // timeRemaining = usedTime > 0 ? (timeTable[i][1] * 60000) - timeElapsed : timeTable[i][1] * 60000;
        timeRemaining = timeTable[row][1] * 60000 - timeElapsed;
        console.log("Time remaining: " + timeRemaining);
        progressBar.pause();
        setTimerOn(false);
      }      
    }

    // this.resume = async function() {
    //   // if paused, continue timer
    //   if (!timerOn) {
    //     sayThis("Resuming " + timeTable[row][0]);
    //     setTimerOn(true);
    //     startClockButton.value = "Pause timer";        
    //     progressBar.resume();
    //     //run();
    //     startTime = new Date();
    //     await delay(timeRemaining);
    //     sayThis("End of discussion.");
    //     timeElapsed = 0;
    //   }
    // }

    this.addTime = async function() {
      // update time by adding extra time to the total kept in timeTable
      sayThis("Time added.");
      // time is kept as a string inside timeTable (MULTIPLY BY ONE FOR QUICK FIX, ADD A CHECK OF VALUES LATER)
      timeTable[row][1] = (timeTable[row][1] * 1) + (addMinutes * 1); // this is in minutes unit!
      console.log("New time after adding: " + (timeTable[row][1] * 60000));
      timeRemaining = timeTable[row][1] * 60000 - timeElapsed;
      console.log("Time remaining: " + timeRemaining);
      startClockButton.value = "Pause timer";
      
      // update progress bar
      progressBar.setTime(timeTable[row][1] * 60);
      // flag for start function
      addedTime = true;
      // progressBar.resume();
      // // run();
      // startTime = new Date();
      // await delay(timeRemaining);
      // sayThis("End of discussion.");
      // timeElapsed = 0;
    }

    this.skip = function() {
      if (timerOn) {
        // stop timer
        clearTimeout(timeOut)
        // increment row
        row += 1;
        if (row == timeTable.length) { // skipping on last topic
          sayThis("End of discussion.");
          // if (!timerModeOn) {
          //   row = 1;
          //   startClockButton.value = "Start clock";
          // }          
        } else {
          // sayThis("Next topic.");
          timeRemaining = timeTable[row][1] * 60000;                    
        } 
        // reset starting conditions of variables
        timeElapsed = 0;
        timerOn = false;
        progressBar.setWidth(100);
        progressBar.reset();
        progressBar = undefined;
      }      
    }

    this.getTimeElapsed = function() {
      return timeElapsed;
    }

    // async function run() {
    //   startTime = new Date();
    //   await delay(timeRemaining);
    //   sayThis("End of discussion.");
    //   timeElapsed = 0;
    // }

    function setTimerOn(on) {
      timerOn = on;
    }

    this.setTimeElapsed = function(time) {
      timeElapsed = time;
    }

    // /**
    //  * Creates speechSynthesis object and speaks sayThisText
    //  * 
    //  * @param {string} sayThisText The text being 'spoken'
    //  */
    // function sayThis(sayThisText) {
    //   let v = new SpeechSynthesisUtterance();
    //   v.lang = 'en-US';
    //   v.rate = 1;
    //   v.text = sayThisText;
    //   speechSynthesis.speak(v);
    // }
  };
}

// listener for the clock button (tracks time of discussions)
startClockButton.addEventListener("click", function (event) {
  console.log("Clock button clicked");
  // check if schedule populated
  if (!timeTable || !timeTable.length) { // if not populated
    // error? OR, button doesn't appear in unpopulated page
    // "No meeting agenda detected/Do you want to create a new meeting agenda?"
    console.log("timetable is invalid");
  } else if (!clockRunning) {// and table populated
    // check the timeTable[i][1] column for non-number values?

    startClockButton.value = 'Timer starting...';
    // startClockButton.textContent = 'Timer starting...';

    // flag for functionality of add time and skip buttons
    clockRunning = true;

    // if timer not previously started
    if (timerFinished) {
      console.log("Starting from beginning of agenda");
      // loop through timetable
      timer = new Timer(currentRow);
      timer.start();
      // countdown clock
      countdown.start();
    } else { // timer was paused
      console.log("Resuming from pause");
      // timer.resume();
      timer.start();
      // reset countdown amount?
      countdown.start();
    } 
    // tone for end of topic?    

  } else if (timeOut) { // PAUSE, or when timeTable is populated but clock is already running
    // pauseTimer();
    timer.pause();
    countdown.pause();
    // startClockButton.value = 'Resume timer';
    // startClockButton.textContent = 'Timer paused';
    console.log("Timer paused");
    // flags?
    clockRunning = false;
    // timeOut = undefined;
  }
});

// listener for add time button will add extra time to the topic discussion clock
addTimeButton.addEventListener("click", function (event) {
  console.log("Add time button clicked");
  // check that timer is running?
  if (clockRunning) {
    // pause
    timer.pause();
    timer.addTime();
    timer.start();
  }

  // should the app ask if they want extra time?
  // asking means it must wait for a click from the user
  // or voice control will wait for "yes" or "no"
})

// listener to skip to next topic
skipTopicButton.addEventListener("click", function (event) {
  console.log("Skip button clicked");

  if (clockRunning) {
    timer.skip();

    // increment row
    currentRow++;
    // start timer on new row
    timer.start();
  }
})

/**
 * (Replaced by progress bar)
 * Highlight the active topic row on html agenda table in the given color (visual cues).
 * 
 * @param {number} row 
 * @param {string} color 
 */
function highlightRow(row, color) {
  // updateProgress(12);

  // id of rows is "row" + the row number  
  for (var i = 1; i < timeTable.length; i++) {
    var rowToClear = document.getElementById("row" + i);
    // clear previous highlighting
    rowToClear.setAttribute("style", "background-color:none");
  }

  // COLORS
  // active: #C8E6C9
  // paused but active: #f5f5f5
  var rowToHighlight = document.getElementById("row" + row);
  rowToHighlight.setAttribute("style", "background-color:" + color);
}

// variables for progressBar
var timerStarted = false; //not used meaningfully
var paused = false; // not being used??

class ProgressBar {
  constructor(seconds, barNum) {
    var startingNewBar = true;
    var elem = document.getElementById(barNum);
    var width = 0;
    var id;// = setInterval(increment, 500);
    var timeElapsed = 0;
    var totalTime = seconds;
    var green = "#a9dfbf";
    var yellow = "#f9e79f";
    var red = "#d98880";

    /**
     * Timer modes: automatic move on vs manual progression
     * Different color thresholds for progress bar based on mode 
     */
    var yellowThreshold;
    var redThreshold;
    if (timerModeOn) {
      yellowThreshold = 65;
      redThreshold = 85;
    } else {
      yellowThreshold = 85;
      redThreshold = 100;
    }

    this.start = function() {
      id = setInterval(increment, 1000);
    }

    this.pause = function() {
      clearInterval(id);
      if (width >= redThreshold) {
        elem.style.backgroundColor = red;
      }
      else if (width >= yellowThreshold) {
        elem.style.backgroundColor = yellow;
      } else {
        elem.style.backgroundColor = green;
      }
    }

    this.resume = function() {
      if (startingNewBar) {
        // width = 0;
        startingNewBar = false;
        // id = setInterval(increment, 1000);
      }
      if (width < 100) {
        // console.log("width (after pause): " + width);
        id = setInterval(increment, 1000);
      }
    }

    this.setTime = function(newTime) {
      totalTime = newTime;
    }

    this.setWidth = function(newWidth) {
      width = newWidth;
    }

    this.reset = function() {
      clearInterval(id);
      elem.style.backgroundColor = "white";
      startingNewBar = true;
      timerStarted = false; // global var
    }

    function increment() {
      // console.log("width: " + width);
      if (width >= 100) {
        // console.log("width: " + width);
        // console.log("time elapsed: " + timeElapsed);
        // console.log("total time: " + totalTime);
        // console.log("Progress bar completed.");
        if (timerModeOn) { // auto advance mode
          clearInterval(id);
          elem.style.backgroundColor = "white";
          startingNewBar = true;
          timerStarted = false; // global var
        } else{
          // console.log("width (>=): " + width);
          width = 100;
          // console.log("width: " + width);
          elem.style.width = width + "%";
          elem.style.backgroundColor = "#cd6155"; // red
        }        
      } else {
        timeElapsed = timeElapsed + 1;
        // console.log("time elapsed: " + timeElapsed);
        // console.log("total time: " + totalTime);
        width = Math.round((timeElapsed/totalTime) * 100);
        // console.log("width: " + width);
        elem.style.width = width + "%";
        // elem.innerHTML = width + "%";
        if (width >= redThreshold) {
          elem.style.backgroundColor = red;
        }
        else if (width >= yellowThreshold) {
          elem.style.backgroundColor = yellow;
        } else {
          elem.style.backgroundColor = green;
        }
      };
    }
  };
}

class CountdownClock {
  constructor(totalTime) {
    var time = new Date(totalTime);
    // console.log("remaining time: " + totalTime);
    time.setHours(0);
    var timeInterval;
    var elapsedTime = 0;
    var timeTick = 0;

    this.start = function() {
      var startTime = new Date();
      // console.log("startTime: " + startTime);
      timeInterval = setInterval(function() {
        timeTick = Date.parse(new Date()) - Date.parse(startTime);
        // console.log("elapsedTime: " + elapsedTime);
        var remainingTime = totalTime - timeTick - elapsedTime;
        // console.log("remainingTime = " + remainingTime);
        // console.log("this is the old time: " + time);
        if (remainingTime < 0) {
          time.setTime(remainingTime * -1);
          time.setHours(0);
          timeRemainingDisplay.innerHTML = "-" + time.toTimeString().substring(0, 8);
        } else {
          time.setTime(remainingTime);
          time.setHours(0);
          timeRemainingDisplay.innerHTML = time.toTimeString().substring(0, 8);
        }    
        // console.log("this is the new time: " + time);
        
      }, 1000);
    }

    this.pause = function() {
      console.log("pausing countdown");
      elapsedTime += timeTick;
      clearInterval(timeInterval);
    }

    this.display = function() {
      timeRemainingDisplay.innerHTML = time.toTimeString().substring(0, 8);
    }
  }
}

/*
 * Action Item + Speech Recognition section
 */

// DECLARE KEYWORD ARRAYS (and keyword substring length?)
var keywords = ["add action item"];
 
// listener for saving action items
recordActionItemButton.addEventListener("click", function (event) {
  // take the action item from final_transcript
  // add to list!
  addActionItem(final_transcript);
  emailButton.style.dislay = "inline";
})

recognition.onstart = function () {
  recognizing = true;
}

recognition.onend = function () {
  recognizing = false;
  if (!final_transcript) {
    return;
  }
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
    let range = document.createRange();
    range.selectNode(document.getElementById("final_span"));
    window.getSelection().addRange(range);
  }
}

let currentIndex = 0;

recognition.onresult = function (event) {
  let interim_transcript = "";
  // q.value = "...";
  for (var i = event.resultIndex; i < event.results.length; ++i) {
    if (event.results[i].isFinal) {
      final_transcript += event.results[i][0].transcript;
    } else {
      interim_transcript += event.results[i][0].transcript;
    }
  }

  if (voiceControlOn) {
    // start and end phrases loaded when initializing options
    // let startPhrase = "action item";
    // let endPhrase = "save item";

    // listen for action item command	
    // console.log("final transcript: " + final_transcript);
    // console.log("interim transcript: " + interim_transcript);
    // let newlyAddedToTranscript = final_span.innerHTML.substring(currentIndex).toLowerCase();
    let newlyAddedToTranscript = final_transcript.substring(currentIndex).toLowerCase();
    console.log("newlyAdded: " + newlyAddedToTranscript);
    if (newlyAddedToTranscript.includes(endPhrase)) {
      console.log("End phrase heard!")
      let startIndex = newlyAddedToTranscript.lastIndexOf(startPhrase) + startPhrase.length;
      // console.log("StartIndex = " + startIndex);
      let endIndex = newlyAddedToTranscript.lastIndexOf(endPhrase);
      let newActionItem = newlyAddedToTranscript.substring(startIndex, endIndex);
      addActionItem(newActionItem);
      currentIndex = final_transcript.length; // to start next scan after the latest end phrase
      // console.log("currentIndex: " + currentIndex);
      // action_span.innerHTML += '<br>';
    }
  }
  

  final_transcript = capitalize(final_transcript);

  // display transcript texts
  final_span.innerHTML = linebreak(final_transcript);
  interim_span.innerHTML = linebreak(interim_transcript);

  // if (final_transcript || interim_transcript) {
  //   showButtons('inline-block');
  // }

  // if (event.results.length > 0) {
  // 	q.value = event.results[0][0].transcript;
  // 	//q.form.submit();
  // 	//executeVoiceCommand(q);
  // 	//location.reload()
  // }
}

// formatting stuff
var first_char = /\S/;
function capitalize(s) {
  return s.replace(first_char, function (m) { return m.toUpperCase(); });
}
var two_line = /\n\n/g;
var one_line = /\n/g;
function linebreak(s) {
  return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
}

speechRecognitionButton.addEventListener("click", function (event) {
  // recognition.start();
  // q.value = "listening...";
  if (recognizing) {
    recognition.stop();
    speechRecognitionButton.value = 'Click to speak';
    return;
  }
  final_transcript = "";
  recognition.lang = "en-US";
  recognition.start();
  speechRecognitionButton.value = 'Stop recording';
  final_span.innerHTML = '';
  interim_span.innerHTML = '';
  // start_timestamp = event.timeStamp;
});

// formats the action items into email (sent by default email handler)
// add recipients later (google sheet?)
emailButton.addEventListener('click', function (event) {  
  // ask background for list of emails
  chrome.runtime.sendMessage({greeting: "emails"}, function(response) {
    if (chrome.runtime.lastError) {
        console.log("There's a chrome runtime error: " + chrome.runtime.lastError);
    } else {
        console.log(response.farewell);
        return true;
    }
  });
});

function sendEmail(emails) {
  // finalize the action item array
  if (tempItemArray.length != 0) {
    actionItemArray.push(tempItemArray);
    tempItemArray = [];
  }  
  // for testing
  // actionItemArray = [[], ["topic 1", "topic 1.5"], ["another one"], ["topic 3", "topic 4"]]; 
  var subject = "Meeting Notes";
  var body = "Action Items\n\n";
  // copy action items from array
  for (var i = 1; i < actionItemArray.length; i++) {
    // body += actionItemArray[i] + "\n";
    body += timeTable[i][0] + "\: ";
    for (var j = 0; j < actionItemArray[i].length; j++) {
      body += actionItemArray[i][j];
      if (j + 1 != actionItemArray[i].length) {
        body += ", ";
      }
    }
    body += "\n";
  }
  var emailList = emails.join(',');
  var emailUrl = 'mailto:' + emailList + '?subject=' + subject + '&body=' + encodeURIComponent(body);
  chrome.tabs.update({ url: emailUrl });
}

// saves list of action items to google sheet
saveButton.addEventListener('click', function(event) {
  console.log("save button clicked");  
  // finalize the action item array
  if (tempItemArray.length != 0) {
    actionItemArray.push(tempItemArray);
    tempItemArray = [];
  }  
  // for testing
  // actionItemArray = [[], ["topic 1", "topic 1.5"], ["another one"], ["topic 3", "topic 4"]]; 
  // format must be an array of arrays [[], [], []] to match the rows and columns of spreadsheet
  // var formattedActionItemList = [];
  // for (var a of actionItemArray) {
  //   formattedActionItemList.push([a]);
  // }
  // var formattedActionItemArray = actionItemArray.splice(1);
  var formattedActionItemArray = []
  for (var i = 1; i < actionItemArray.length; i++) {
    formattedActionItemArray[i - 1] = [actionItemArray[i].join(", ")];
  }
  console.log("formatted array: " + formattedActionItemArray);
  // message action item list to background
  chrome.runtime.sendMessage({greeting: "actionItemsFromPopup", actionItems: formattedActionItemArray}, function (response) {
    console.log('sent ' + formattedActionItemArray);
    return true;
  })
})

var currentTopic = 0;
var tempItemArray = [];
/**
 * Adds action item newItem to list.
 * 
 * @param {string} newItem 
 */
function addActionItem(newItem) {
  // make action item list visible
  actionItemList.style.display = "inline";
  if (newItem.length > 0) {
    // console.log("To add to list: " + newItem);
    // let itemList = actionItemList.innerHTML.trim();    
    // // if (itemList == "" || itemList == null) {
    // //   actionItemList.innerHTML += '<h3>Action Items</h3>';
    // // }
    // console.log("current row: " + currentRow);
    // console.log("current topic: " + currentTopic);
    if (currentRow != currentTopic) {
      // only add topic if saving action item
      actionItemList.innerHTML += '<h4>' + timeTable[currentRow][0] + '</h4>';
      // bug: prevent incrementing topic when no timer is set/running
      // but results in multiple headers if saving before timer started
      
      // put empty array if no action item saved for a topic
      while (currentRow != currentTopic) {
        // console.log("current row: "+ currentRow);
        // console.log("current topic (list): " + currentTopic);
        currentTopic++;
      }
      // currentTopic = currentRow;
      actionItemArray.push(tempItemArray);
      for (var i = 0; i < actionItemArray.length; i++) {
        console.log("action item array[" + i + "]: " + actionItemArray[i]);
      }
      // reset array for new row?
      tempItemArray = [];
    }    
    // display on popup.html
    actionItemList.innerHTML += '<li>' + newItem + '</li>';
    // actionItemArray.push(newItem);
    tempItemArray.push(newItem);
    console.log("temp array: " + tempItemArray);
  }
}

/*
 * Meeting Agenda Section
 */

// on open, check with contentScript if it is a spreadsheet
// if yes, ask background for the schedule array (background does spreadsheet format check)
function onSpreadsheet() {
  console.log("Ask content script if spreadsheet");
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    console.log(tabs[0].id);
    chrome.tabs.sendMessage(tabs[0].id, { greeting: "askForSpreadsheet" }, function (response) {
      // for the unchecked runtime error
      if (chrome.runtime.lastError) {
        console.log("There's a chrome runtime error: " + chrome.runtime.lastError);
      }
      // if there's a valid response, we are on spreadsheet! (if response == undefined, not on a spreadsheet tab)
      if (typeof response !== 'undefined') {
        console.log(response.farewell);
        // display being handled by populateTable
        popupSpreadsheetStuff.style.display = "inline";
        popupHomePage.style.display = "none";
      } else {
        console.log("Not on spreadsheet tab (content script not active)");
        // make popup display a "homepage"/default page
        popupSpreadsheetStuff.style.display = "none";
        popupHomePage.style.display = "inline";
      }
    });
    return true;
  });
}

// retrieve option settings from storage
function initializeOptions() {
  console.log("Retrieving option variables");
    chrome.storage.sync.get(['minutes', 'voiceControl', 'timerMode', 'start', 'stop'], function(items) {
        addTime = items.minutes;
        voiceControlOn = items.voiceControl;
        timerModeOn = items.timerMode;
        startPhrase = items.start;
        endPhrase = items.stop;
        console.log("Increment time by: " + addTime);
        console.log("Continuous voice control: " + voiceControlOn);
        console.log("Auto-progression for timer on? " + timerModeOn);
        console.log("Start phrase is: " + startPhrase);
        console.log("End phrase is: " +endPhrase);
      });
  // addTimeButton.value = "+" + addTime + "min";
}

// populate html table to display
function populateTable(schedule) {
  // check for empty schedule
  if (!schedule || schedule.length == 0) {
    console.log("We're on an improperly formatted spreadsheet.");
    // hide table and display default popup page
    popupSpreadsheetStuff.style.display = "none";
    popupHomePage.style.display = "inline";
    return;
  } else {
    var totalTime = 0;
    for (var i = 1; i < schedule.length; i++) {
      // create a new row
      var newRow = popupTable.insertRow(popupTable.length);
      // set id attribute of row (used for highlighting)
      var rowID = "row" + i;
      newRow.setAttribute("id", rowID);
      for (var j = 0; j < schedule[i].length; j++) {
        // create new cell
        var cell = newRow.insertCell(j);
        // add value to cell
        if (j == 0) {
          // var firstCell = schedule[i][j];
          // create first cell with div for visual timer bar
          // div is class="progress", id="bar#" where # is the row number
          var firstCell = "<div class=\"progress\" id=\"bar" + i + "\"></div>" + schedule[i][j];
          cell.innerHTML = firstCell;
        } else {
          cell.setAttribute("style", "text-align:right");
          cell.innerHTML = schedule[i][j];
          totalTime += parseFloat(schedule[i][j]);
        }
      }
    }
    // create countdown here, start it in on start button
    countdown = new CountdownClock(totalTime*60*1000);
    countdown.display();

    if (voiceControlOn) {
      var saveToListButton = document.getElementById("recordButton");
      saveToListButton.style.display = "none";
    }
    if (!timerModeOn) {
      addTimeButton.style.display = "none";
    }
  }
}

// (on BLANK page) ask background to create new spreadsheet for agenda on click
createAgendaButton.addEventListener("click", function (event) {
  console.log("Ask background to create google sheet");
  // open new spreadsheet?
  chrome.tabs.create({ url: 'https://docs.google.com/spreadsheets/create' });
  // ask background to format/fill in headers
  chrome.runtime.sendMessage({ greeting: "makeNewSheet" }, function (response) {
    console.log(response.farewell);
    return true;
  });
})

// persistence? What if user accidentally closes?