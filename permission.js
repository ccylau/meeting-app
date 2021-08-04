'use strict';

navigator.mediaDevices.getUserMedia({
    audio: true,
}, function(stream) {
    stream.stop();
    // audio permission granted
	// close tab?
}, function(e) {
    // No permission (or no microphone available).
    alert('Error accessing microphone.')
});