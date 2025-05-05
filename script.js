// --- JARVIS Console System ---
let audioContext;
let isSpeaking = false; // Track speaking state
let isListening = false; // Track continuous listening state
let recognitionInstance = null; // Store the current recognition instance
let isFirstCommand = true; // Flag to track if this is the first command after startup
let recognitionRestartPending = false; // Track if we have a pending restart
let geminiRequestTimeout = null; // Store the timeout for Gemini requests
let awaitingGeminiResponse = false; // Track if we're waiting for a Gemini response
let requestTimedOut = false; // Track if the current request has timed out

console.log('JARVIS UI: System Initialized');

// Function to create pulsating effect on JARVIS text
function toggleJarvisSpeakingEffect(speaking) {
  isSpeaking = speaking;
  
  // Find the JARVIS text element in the center of the screen
  const jarvisTextElement = document.querySelector('.jarvis-text');
  const visualizerLine = document.querySelector('.audio-visualizer-line');
  
  if (speaking) {
    // Start pulsating effect when speaking
    console.log('JARVIS UI: Voice Active');
    
    // If speech recognition is active, stop it while Jarvis is speaking
    pauseSpeechRecognition();
    
    // Update visualizer to speaking mode, remove listening indicator
    if (visualizerLine) {
      visualizerLine.classList.add('speaking-active');
      visualizerLine.classList.remove('listening');
    }
    
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
    
    // Update visualizer to no longer show speaking
    if (visualizerLine) {
      visualizerLine.classList.remove('speaking-active');
      
      // Add the listening indicator back if we're listening
      if (isListening) {
        visualizerLine.classList.add('listening');
      }
    }
    
    if (jarvisTextElement) {
      jarvisTextElement.classList.remove('jarvis-speaking');
    } else {
      document.dispatchEvent(new CustomEvent('jarvis-speaking-stop'));
    }
    
    // Resume listening immediately after speaking is done
    resumeSpeechRecognition();
  }
}

// Function to handle Gemini request timeout
function handleGeminiTimeout() {
  if (awaitingGeminiResponse) {
    console.error('JARVIS UI: Gemini Request Timeout');
    
    // Mark the request as timed out so we'll ignore any late response
    requestTimedOut = true;
    
    // Remove processing indicator
    const visualizerLine = document.querySelector('.audio-visualizer-line');
    if (visualizerLine) {
      visualizerLine.classList.remove('processing');
    }
    
    // Notify the user about the timeout
    speakTimeoutMessage();
    
    // Clear the awaiting response flag
    awaitingGeminiResponse = false;
    
    // Resume listening
    if (!isListening && !isSpeaking) {
      resumeSpeechRecognition();
    }
  }
  
  // Clear the timeout reference
  geminiRequestTimeout = null;
}

// Speak a timeout message to the user
async function speakTimeoutMessage() {
  try {
    console.log('JARVIS UI: Speaking timeout message');
    
    // Ensure the request is marked as timed out
    requestTimedOut = true;
    
    // Create a timeout message audio
    const response = await fetch('http://localhost:5000/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: "I'm sorry, but I'm having trouble getting a response right now. Please try again in a moment." 
      })
    });
    
    if (!response.ok) {
      console.error('JARVIS UI: TTS Error ' + response.status);
      // If TTS fails, just resume listening
      resumeSpeechRecognition();
      return;
    }
    
    const audioData = await response.arrayBuffer();
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    
    // Initialize audio context if needed
    initAudioContext();
    
    // Create and set up audio element
    const audio = new Audio(url);
    audio.addEventListener('canplaythrough', () => {
      // Start speaking animation
      toggleJarvisSpeakingEffect(true);
      audio.play();
    });
    
    // Resume listening after message
    audio.onended = () => {
      toggleJarvisSpeakingEffect(false);
      // Clean up the URL
      URL.revokeObjectURL(url);
    };
    
  } catch (e) {
    console.error('JARVIS UI: Error with timeout message - ' + e.message);
    // Resume listening if there's an error
    toggleJarvisSpeakingEffect(false);
  }
}

// Pause speech recognition if it's currently active
function pauseSpeechRecognition() {
  if (recognitionInstance && isListening) {
    console.log('JARVIS UI: Pausing listening while speaking');
    try {
      recognitionInstance.abort(); // Just pause, don't fully stop
      isListening = false;
      
      // Remove listening indicator
      const visualizerLine = document.querySelector('.audio-visualizer-line');
      if (visualizerLine) {
        visualizerLine.classList.remove('listening');
      }
    } catch (e) {
      console.error('JARVIS UI: Error pausing speech recognition:', e);
    }
  }
}

// Resume speech recognition immediately
function resumeSpeechRecognition() {
  // Only start if we're not already listening and not already planning to start
  if (!isListening && !recognitionRestartPending && !isSpeaking) {
    console.log('JARVIS UI: Resuming listening');
    // Start immediately with no delay
    startContinuousListening();
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

// Continuous listening that only processes when "Jarvis" is detected
// For first command after greeting, wake word is not required
function startContinuousListening() {
  // If we're already listening or Jarvis is speaking, don't start another instance
  if (isListening || isSpeaking) return;
  
  // Mark that we're planning to start (to avoid multiple pending starts)
  recognitionRestartPending = true;
  
  if (isFirstCommand) {
    console.log('JARVIS UI: Listening for first command (no wake word needed)');
  } else {
    console.log('JARVIS UI: Listening for wake word');
  }
  
  if (!('webkitSpeechRecognition' in window)) {
    console.error('JARVIS UI: Speech Recognition Not Supported');
    alert('Speech recognition not supported in this browser.');
    recognitionRestartPending = false;
    return;
  }
  
  // Initialize audio
  initAudioContext();
  
  try {
    const recognition = new webkitSpeechRecognition();
    recognitionInstance = recognition; // Store the instance for potential abortion
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = true; // Set to true for more continuous behavior
    recognition.maxAlternatives = 1;
    
    recognition.onresult = function(event) {
      // Get the last result (most recent speech)
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
      console.log('USER: ' + transcript);
      
      // Check if this is the first command after startup
      if (isFirstCommand) {
        // Process the command directly without checking for wake word
        console.log('JARVIS UI: Processing first command directly: ' + transcript);
        sendToGemini(transcript);
        sendUserTextToBackend(transcript);
        isFirstCommand = false; // Set flag to false after processing first command
      } else {
        // For subsequent commands, check for wake word
        if (transcript.startsWith('jarvis')) {
          const command = transcript.substring(6).trim(); // Remove "jarvis" and trim
          
          if (command) { // Only process if there's an actual command after "jarvis"
            console.log('JARVIS UI: Wake word detected, processing: ' + command);
            sendToGemini(command);
            sendUserTextToBackend(command);
          } else {
            // If just "Jarvis" with no command, provide a prompt
            notifyJarvisActivated();
          }
        } else {
          // If wake word not detected, just continue listening (no need to restart)
          console.log('JARVIS UI: Wake word not detected, continuing to listen');
        }
      }
    };
    
    recognition.onerror = function(event) {
      if (event.error === 'no-speech') {
        // This is expected, just log it and keep listening
        console.log('JARVIS UI: No speech detected');
      } else if (event.error === 'aborted') {
        // This is an expected error when we manually abort, don't log it as an issue
        console.log('JARVIS UI: Listening aborted intentionally');
      } else {
        // Log other errors but don't alert the user for minor issues
        console.error('JARVIS UI: Recognition Error - ' + event.error);
      }
      
      isListening = false;
      recognitionRestartPending = false;
      
      // Remove listening indicator
      const visualizerLine = document.querySelector('.audio-visualizer-line');
      if (visualizerLine) {
        visualizerLine.classList.remove('listening');
      }
      
      // Only restart if not speaking and not a simple abort
      if (!isSpeaking && event.error !== 'aborted') {
        // Restart with minimal delay
        startListeningAfterDelay(100);
      }
    };
    
    recognition.onend = function() {
      // Mark as not listening and clear the pending flag
      isListening = false;
      recognitionRestartPending = false;
      
      // Remove listening indicator
      const visualizerLine = document.querySelector('.audio-visualizer-line');
      if (visualizerLine) {
        visualizerLine.classList.remove('listening');
      }
      
      // Automatically restart if we're not speaking
      if (!isSpeaking) {
        // Restart with minimal delay to allow the system to clean up
        startListeningAfterDelay(50);
      }
    };
    
    recognition.onstart = function() {
      // Mark as actively listening and clear the pending flag
      isListening = true;
      recognitionRestartPending = false;
      
      // Add listening indicator if not speaking
      if (!isSpeaking) {
        const visualizerLine = document.querySelector('.audio-visualizer-line');
        if (visualizerLine) {
          visualizerLine.classList.add('listening');
          visualizerLine.classList.remove('speaking-active');
        }
      }
    };
    
    // Start the recognition
    recognition.start();
    
  } catch (e) {
    console.error('JARVIS UI: Error starting speech recognition:', e);
    isListening = false;
    recognitionRestartPending = false;
    
    // Remove listening indicator
    const visualizerLine = document.querySelector('.audio-visualizer-line');
    if (visualizerLine) {
      visualizerLine.classList.remove('listening');
    }
    
    // Try to restart after error with a longer delay
    if (!isSpeaking) {
      startListeningAfterDelay(1000);
    }
  }
}

// Helper function to add delay before restarting listening
function startListeningAfterDelay(delay) {
  // Only schedule a restart if one isn't already pending
  if (!recognitionRestartPending) {
    recognitionRestartPending = true;
    
    setTimeout(() => {
      // Double-check that we're still not listening and not speaking
      if (!isListening && !isSpeaking) {
        startContinuousListening();
      } else {
        // If circumstances changed, clear the pending flag
        recognitionRestartPending = false;
      }
    }, delay);
  }
}

// Notify user that Jarvis is activated but waiting for a command
function notifyJarvisActivated() {
  playJarvisActivationSound();
  console.log('JARVIS UI: Activated, waiting for command');
  
  // Add visual indication that Jarvis is listening more intently
  const visualizerLine = document.querySelector('.audio-visualizer-line');
  if (visualizerLine) {
    // Flash the listening indicator by temporarily removing and adding it
    visualizerLine.classList.remove('listening');
    setTimeout(() => {
      if (isListening && !isSpeaking) {
        visualizerLine.classList.add('listening');
      }
    }, 200);
  }
}

// Play a small sound to indicate Jarvis is activated
function playJarvisActivationSound() {
  if (!audioContext) initAudioContext();
  
  const context = audioContext;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.1, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
  
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  
  oscillator.start();
  oscillator.stop(context.currentTime + 0.2);
}

// For backward compatibility - now just starts the continuous listening
function startSpeechRecognition() {
  if (!isListening && !recognitionRestartPending && !isSpeaking) {
    startContinuousListening();
  }
}

// Simplified API communication logs
async function sendToGemini(text) {
  console.log('JARVIS UI: Processing Request');
  
  // Reset timed out flag for new request
  requestTimedOut = false;
  
  // Add visual processing indicator
  const visualizerLine = document.querySelector('.audio-visualizer-line');
  if (visualizerLine) {
    visualizerLine.classList.add('processing');
    visualizerLine.classList.remove('listening');
  }
  
  // Set the awaiting response flag
  awaitingGeminiResponse = true;
  
  // Set a timeout for the Gemini request (15 seconds)
  if (geminiRequestTimeout) {
    clearTimeout(geminiRequestTimeout);
  }
  geminiRequestTimeout = setTimeout(handleGeminiTimeout, 15000);
  
  try {
    const response = await fetch('http://localhost:5000/api/ask-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    // Clear the awaiting response flag and timeout since we got a response
    awaitingGeminiResponse = false;
    if (geminiRequestTimeout) {
      clearTimeout(geminiRequestTimeout);
      geminiRequestTimeout = null;
    }
    
    // Remove processing indicator
    if (visualizerLine) {
      visualizerLine.classList.remove('processing');
    }
    
    if (!response.ok) {
      console.error('JARVIS UI: API Error ' + response.status);
      // Resume listening on error
      resumeSpeechRecognition();
      return;
    }
    
    // If the request timed out, discard this response completely
    if (requestTimedOut) {
      console.log('JARVIS UI: Discarding late response because request timed out');
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
      // Check again if the request timed out while loading audio
      if (requestTimedOut) {
        console.log('JARVIS UI: Discarding late response audio because request timed out');
        URL.revokeObjectURL(url); // Clean up the URL
        return;
      }
      
      console.log('JARVIS UI: Speaking');
      // Start the speaking animation - will also pause listening
      toggleJarvisSpeakingEffect(true);
      audio.play();
    });
    
    // When audio ends, start listening again
    audio.onended = () => {
      console.log('JARVIS UI: Response Complete');
      // Ensure first command flag is false after responding to ensure wake word is needed next time
      isFirstCommand = false;
      // Stop the speaking animation - will resume listening
      toggleJarvisSpeakingEffect(false);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
    };
    
  } catch (e) {
    // Clear the awaiting response flag and timeout since we got an error
    awaitingGeminiResponse = false;
    if (geminiRequestTimeout) {
      clearTimeout(geminiRequestTimeout);
      geminiRequestTimeout = null;
    }
    
    // Remove processing indicator
    if (visualizerLine) {
      visualizerLine.classList.remove('processing');
    }
    
    console.error('JARVIS UI: Error - ' + e.message);
    // Ensure speaking effect is turned off in case of error
    toggleJarvisSpeakingEffect(false);
    // Resume continuous listening
    resumeSpeechRecognition();
  }
}

// Simplified intro sequence
async function playJarvisIntro() {
  console.log('JARVIS UI: Starting Introduction');
  
  try {
    // First show the audio visualizer with initialization animation
    // Make sure it's invisible initially (redundant but ensuring proper state)
    const visualizerLine = document.querySelector('.audio-visualizer-line');
    if (visualizerLine) {
      visualizerLine.style.visibility = 'hidden';
      visualizerLine.style.opacity = '0';
    }
    
    // Initialize the visualizer with its boot sequence
    initializeAudioVisualizer();
    
    // Short delay to allow the visualizer animation to complete its initial sequence
    // Increased from 1200ms to 2500ms for a clearer visualization before speech
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const response = await fetch('http://localhost:5000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "Hi. JARVIS at your service! How can I assist you today?" })
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
      
      // Reset first command flag to ensure the next command doesn't need a wake word
      isFirstCommand = true;
      
      // Start the speaking animation - will pause listening
      toggleJarvisSpeakingEffect(true);
      
      // Play after a very short delay (reduced from 500ms to 100ms)
      setTimeout(() => {
        audio.play();
      }, 100);
    });
    
    // When intro audio ends, begin continuous speech recognition
    audio.onended = () => {
      console.log('JARVIS UI: Introduction Complete');
      
      // Stop the speaking animation - will resume listening
      toggleJarvisSpeakingEffect(false);
    };
    
  } catch (e) {
    console.error('JARVIS UI: Error - ' + e.message);
    // Ensure speaking effect is turned off in case of error
    toggleJarvisSpeakingEffect(false);
    // Start continuous listening despite error
    setTimeout(() => {
      startContinuousListening();
    }, 300);
  }
}

// Initialize audio visualizer with futuristic boot sequence
function initializeAudioVisualizer() {
  console.log('JARVIS UI: Initializing Audio Visualizer');
  const visualizerContainer = document.getElementById('top-visualizer-container');
  const visualizerLine = document.querySelector('.audio-visualizer-line');
  
  if (!visualizerContainer || !visualizerLine) return;
  
  // First make sure the visualizer container is empty
  visualizerContainer.innerHTML = '';
  
  // Make sure visualizer is completely hidden
  visualizerLine.style.visibility = 'hidden';
  visualizerLine.style.opacity = '0';
  visualizerLine.style.transform = 'translateX(-50%) scaleX(0.2)';
  
  // Set up the transition properties for reveal
  visualizerLine.style.transition = 'opacity 0.5s ease-out, transform 0.8s cubic-bezier(0.19, 1, 0.22, 1), visibility 0s linear 0s';
  
  // Add boot sequence class
  visualizerLine.classList.add('boot-sequence');
  
  // Create the bars
  const barCount = 40;
  
  // Add the initial bars with 0 height
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'visualizer-bar';
    bar.style.transform = 'scaleY(0)';
    bar.style.opacity = '0';
    visualizerContainer.appendChild(bar);
  }
  
  // Show the visualizer line with a fade-in and grow effect after a short delay
  setTimeout(() => {
    // Make the container visible first
    visualizerLine.style.visibility = 'visible';
    
    // Then start the fade-in (after a tiny delay to ensure visibility is applied)
    setTimeout(() => {
      visualizerLine.style.opacity = '1';
      visualizerLine.style.transform = 'translateX(-50%) scaleX(1)';
      
      // After the container is visible, start the bar sequence
      setTimeout(() => {
        const bars = visualizerContainer.querySelectorAll('.visualizer-bar');
        
        // Emit digital initialization sound
        playDigitalInitSound();
        
        // Sequential bar initialization for a futuristic scanning effect
        bars.forEach((bar, index) => {
          setTimeout(() => {
            // Random height between 0.15 and 0.8
            const initialHeight = 0.15 + (Math.random() * 0.65);
            bar.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
            bar.style.transform = `scaleY(${initialHeight})`;
            bar.style.opacity = '1';
            
            // If it's the last bar, add a final "system ready" effect
            if (index === bars.length - 1) {
              setTimeout(() => {
                // Completion sound
                playSystemReadySound();
                
                // Remove boot sequence class
                visualizerLine.classList.remove('boot-sequence');
                
                // Final system ready pulse effect
                bars.forEach((bar, i) => {
                  setTimeout(() => {
                    // Spike up
                    bar.style.transform = 'scaleY(0.9)';
                    setTimeout(() => {
                      // Random height between 0.1 and 0.3 for idle state
                      const idleHeight = 0.1 + (Math.random() * 0.2);
                      bar.style.transform = `scaleY(${idleHeight})`;
                      
                      // Set varied animation speeds for more organic movement
                      const speed = 0.8 + Math.random() * 0.8; // 0.8-1.6s
                      bar.style.animationDuration = `${speed}s`;
                      
                      if (i === bars.length - 1) {
                        // After all bars are settled, prepare for operating mode
                        visualizerLine.classList.add('ready');
                        // Pulse the background to indicate system is ready
                        const pulseRing = visualizerLine.querySelector('.pulse-ring');
                        if (pulseRing) {
                          pulseRing.classList.add('animate');
                          setTimeout(() => {
                            pulseRing.classList.remove('animate');
                          }, 1000);
                        }
                      }
                    }, 200);
                  }, i * 8); // Extremely fast ripple effect to show system ready
                });
              }, 100);
            }
          }, index * 20); // Staggered initialization
        });
      }, 300);
    }, 20);
  }, 800); // Longer initial delay before showing visualizer
}

// Digital initialization sound for visualizer boot sequence
function playDigitalInitSound() {
  // Create a beep sound using the Web Audio API
  if (!audioContext) initAudioContext();
  if (!audioContext) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.error('Failed to play digital init sound:', e);
  }
}

// System ready sound for visualizer completion
function playSystemReadySound() {
  // Create a system ready sound using the Web Audio API
  if (!audioContext) initAudioContext();
  if (!audioContext) return;
  
  try {
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5);
    
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(audioContext.currentTime + 0.6);
    oscillator2.stop(audioContext.currentTime + 0.6);
  } catch (e) {
    console.error('Failed to play system ready sound:', e);
  }
}

// Make functions available globally
window.playJarvisIntro = playJarvisIntro;
window.startSpeechRecognition = startSpeechRecognition;
window.startContinuousListening = startContinuousListening;
window.initializeAudioVisualizer = initializeAudioVisualizer; // Export function for potential manual triggering

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
    
    // Also activate our audio visualizer
    const visualizerContainer = document.getElementById('top-visualizer-container');
    if (visualizerContainer) {
      visualizerContainer.parentElement.classList.add('speaking-active');
      
      // Trigger the pulse ring animation
      const pulseRing = visualizerContainer.parentElement.querySelector('.pulse-ring');
      if (pulseRing) {
        // Reset animation by removing and re-adding the class
        pulseRing.classList.remove('animate');
        setTimeout(() => {
          pulseRing.classList.add('animate');
        }, 10);
      }
    }
  });
  
  document.addEventListener('jarvis-speaking-stop', function() {
    // Reset the flag when speaking stops
    window.jarvisSpeaking = false;
    
    // Also deactivate our audio visualizer
    const visualizerContainer = document.getElementById('top-visualizer-container');
    if (visualizerContainer) {
      visualizerContainer.parentElement.classList.remove('speaking-active');
    }
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
});