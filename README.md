# Meeting App

A Chrome extension that is used in conjunction with Google Sheets to facilitate meetings. Requires Chrome browser to use and a working microphone for full functionality.

## Building

1. Clone this repo.
1. Open Chrome and navigate to the extension management page (Menu > More tools > Extensions OR chrome://extensions/).
1. Switch to Developer mode (top right corner).
![Extension management page](/images/ChromeExtension_managePage.png)
1. Load unpacked (top left).
1. Select folder containing this repo.

## Creating Client Credentials

1. Visit https://console.developers.google.com/ to access Google API Console.
1. Select Credentials to bring up the credentials page.
1. Click Create Credentials.
1. Select OAuth Client ID.
1. Select Chrome App for Application Type.
1. Create a name for your client.
1. Copy the ID of the unpacked extension from the extension management page and enter it under Application ID.
1. Click create. This will generate your client ID.
1. Copy the client ID and paste into manifest.json under the “client_id” field of “oauth2”.
1. Reload the extension on the extension management page to update the manifest.

## Initializations

### Allow Microphone Access

1. Open Options page (right click on extension button on toolbar)

A known bug makes this request impossible to do in other scripts of the extension.

### Sign into the Chrome browser.

This is necessary for the app to read and write to your Google Sheets.

### Meeting Agenda Spreadsheet Formatting

1. Cell A1 of Google Sheet must say "Topic". Enter topics starting from A2.
1. Cell B1 of Google Sheet must say "Time (min)". Enter times starting from B2.
1. (Optional) Column F is for participant emails. Enter emails starting from F2.
1. (Optional) Column D is for recording action items. Keep empty.

An example sheet is linked in the Options page, or see image below.

![Meeting agenda formatting](/images/exampleSpreadsheetFormat.png)