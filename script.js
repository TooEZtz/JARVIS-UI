// --- JARVIS Console System ---
let audioContext;
let isSpeaking = false; // Track speaking state

console.log('JARVIS UI: System Initialized');

// Function to create pulsating effect on JARVIS text
function toggleJarvisSpeakingEffect(speaking) {
  isSpeaking = speaking;
  
  // Find the JARVIS text element in the center of the screen
  const jarvisTextElement = document.querySelector('.jarvis-text');
  
  if (speaking) {
    // Start pulsating effect when speaking
    console.log('JARVIS UI: Voice Active');
    
    // If element exists, add animation class
    if (jarvisTextElement) {
      jarvisTextElement.classList.add('jarvis-speaking');
    } else {
      // If no dedicated element exists, we'll create a pulse directly on canvas
      // This is triggered by a custom event that the canvas animation loop listens for
      document.dispatchEvent(new CustomEvent('jarvis-speaking-start'));
    }
  } else {
    // Stop pulsating effect when not speaking
    console.log('JARVIS UI: Voice Inactive');
    
    if (jarvisTextElement) {
      jarvisTextElement.classList.remove('jarvis-speaking');
    } else {
      document.dispatchEvent(new CustomEvent('jarvis-speaking-stop'));
    }
  }
}

// Initialize audio context only (no visualizer)
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('JARVIS UI: Audio Ready');
  }
}

// Helper function to convert hex to RGB - kept simple
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  
  return { r, g, b };
}

// Modified speech recognition function - simplified logs
function startSpeechRecognition() {
  console.log('JARVIS UI: Listening');
  
  if (!('webkitSpeechRecognition' in window)) {
    console.error('JARVIS UI: Speech Recognition Not Supported');
    alert('Speech recognition not supported in this browser.');
    return;
  }
  
  // Initialize audio
  initAudioContext();
  
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    console.log('USER: ' + transcript);
    sendToGemini(transcript);
    sendUserTextToBackend(transcript);
  };
  
  recognition.onerror = function(event) {
    console.error('JARVIS UI: Error - ' + event.error);
    alert('Speech recognition error: ' + event.error);
  };
  
  recognition.onend = function() {
    // Silent end - no need to log this
  };
  
  recognition.start();
}

// Simplified API communication logs
async function sendToGemini(text) {
  console.log('JARVIS UI: Processing Request');
  
  try {
    const response = await fetch('http://localhost:5000/api/ask-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      console.error('JARVIS UI: API Error ' + response.status);
      return;
    }
    
    const audioData = await response.arrayBuffer();
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    
    // Initialize audio context
    initAudioContext();
    
    // Create audio element and set up
    const audio = new Audio(url);
    audio.addEventListener('canplaythrough', () => {
      console.log('JARVIS UI: Speaking');
      // Start the speaking animation
      toggleJarvisSpeakingEffect(true);
      audio.play();
    });
    
    // When audio ends, start listening again
    audio.onended = () => {
      console.log('JARVIS UI: Response Complete');
      // Stop the speaking animation
      toggleJarvisSpeakingEffect(false);
      
      setTimeout(() => {
        startSpeechRecognition();
      }, 500);
    };
    
  } catch (e) {
    console.error('JARVIS UI: Error - ' + e.message);
    // Ensure speaking effect is turned off in case of error
    toggleJarvisSpeakingEffect(false);
  }
}

// Simplified intro sequence
async function playJarvisIntro() {
  console.log('JARVIS UI: Starting Introduction');
  
  try {
    const response = await fetch('http://localhost:5000/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: "Hi, I am JARVIS. How may I assist you today?" })
    });
    
    if (!response.ok) {
      console.error('JARVIS UI: TTS Error ' + response.status);
      return;
    }
    
    const audioData = await response.arrayBuffer();
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    
    // Initialize audio system
    initAudioContext();
    
    // Create and set up audio element
    const audio = new Audio(url);
    audio.addEventListener('canplaythrough', () => {
      console.log('JARVIS UI: Speaking Introduction');
      
      // Start the speaking animation
      toggleJarvisSpeakingEffect(true);
      
      // Play after a short delay
      setTimeout(() => {
        audio.play();
      }, 500);
    });
    
    // When intro audio ends, begin speech recognition
    audio.onended = () => {
      console.log('JARVIS UI: Introduction Complete');
      
      // Stop the speaking animation
      toggleJarvisSpeakingEffect(false);
      
      setTimeout(() => {
        startSpeechRecognition();
      }, 500);
    };
    
  } catch (e) {
    console.error('JARVIS UI: Error - ' + e.message);
    // Ensure speaking effect is turned off in case of error
    toggleJarvisSpeakingEffect(false);
  }
}

// Make functions available globally
window.playJarvisIntro = playJarvisIntro;
window.startSpeechRecognition = startSpeechRecognition;

// Simplified backend logging
function sendUserTextToBackend(text) {
  fetch('http://localhost:5000/api/user-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })
  .catch(error => {
    console.error('JARVIS UI: Backend Error');
  });
}

// Log ready message when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('JARVIS UI: System Ready');
  
  // Add JARVIS speaking CSS class if it doesn't exist
  if (!document.getElementById('jarvis-animation-style')) {
    const style = document.createElement('style');
    style.id = 'jarvis-animation-style';
    style.textContent = `
      @keyframes jarvis-pulse {
        0% { transform: scale(1); text-shadow: 0 0 20px currentColor; }
        50% { transform: scale(1.05); text-shadow: 0 0 30px currentColor, 0 0 40px currentColor; }
        100% { transform: scale(1); text-shadow: 0 0 20px currentColor; }
      }
      
      .jarvis-speaking {
        animation: jarvis-pulse 0.8s infinite ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Listen for animation events in the canvas rendering loop
  document.addEventListener('jarvis-speaking-start', function() {
    // Set a global flag that the canvas animation can check
    window.jarvisSpeaking = true;
  });
  
  document.addEventListener('jarvis-speaking-stop', function() {
    // Reset the flag when speaking stops
    window.jarvisSpeaking = false;
  });
  
  // Check browser compatibility
  const diagnostics = {
    audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
    speechRecognition: 'webkitSpeechRecognition' in window,
    fetch: 'fetch' in window
  };
  
  // Simple compatibility check
  if (!diagnostics.audioContext) {
    console.warn('JARVIS UI: Audio Not Supported');
  }
  
  if (!diagnostics.speechRecognition) {
    console.warn('JARVIS UI: Voice Control Not Supported');
  }
  
  // Hide the visualizer container if it exists
  const visualizerContainer = document.getElementById('visualizer-container');
  if (visualizerContainer) {
    visualizerContainer.style.display = 'none';
  }
});