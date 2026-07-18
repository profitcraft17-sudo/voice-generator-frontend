// ==========================================
// DYNAMIC BACKEND CONFIGURATION BRIDGE
// ==========================================
// Jab Hugging Face Space ready ho jaye, tab uski URL yahan replace karni hai.
// Abhi ke liye dummy endpoint rakha hai taaki routing na toote.
const BACKEND_API_URL = "https://YOUR_HUGGINGFACE_SPACE_URL.hf.space/api/predict";

// DOM Elements Initialization
const textInput = document.getElementById('text-input');
const wordCountText = document.getElementById('word-count');
const generateBtn = document.getElementById('generate-btn');
const statusMessage = document.getElementById('status-message');
const loadingSpinner = document.getElementById('loading-spinner');
const loadingText = document.getElementById('loading-text');
const audioResultSection = document.getElementById('audio-result-section');
const audioPlayer = document.getElementById('audio-player');
const downloadBtn = document.getElementById('download-btn');
const voiceSelect = document.getElementById('voice-select');

// Character Counter Logic
textInput.addEventListener('input', () => {
    wordCountText.textContent = textInput.value.length;
});

// Main Action Trigger
generateBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    const selectedVoice = voiceSelect.value;

    if (!text) {
        showStatus("Please enter some text first!", "error");
        return;
    }

    // UI Reset and Loader Show
    showStatus("", "hide");
    audioResultSection.classList.add('hidden');
    toggleLoader(true, "Analyzing text and preparing chunks...");

    try {
        // Smart Text Splitting: Breaking into max 200 character chunks for safe processing
        const textChunks = splitTextIntoChunks(text, 200);
        const generatedAudioBlobs = [];

        for (let i = 0; i < textChunks.length; i++) {
            toggleLoader(true, `Generating audio chunk ${i + 1} of ${textChunks.length}...`);
            
            // Backend API Call for each chunk
            const audioBlob = await callVoiceAPI(textChunks[i], selectedVoice);
            generatedAudioBlobs.push(audioBlob);
        }

        // Auto-Merge Logic: Joining all chunks together
        toggleLoader(true, "Merging all voice chunks into final track...");
        const finalAudioBlob = await mergeAudioBlobs(generatedAudioBlobs);
        
        // Creating Playable/Downloadable Object URL
        const audioUrl = URL.createObjectURL(finalAudioBlob);
        audioPlayer.src = audioUrl;
        downloadBtn.href = audioUrl;

        // Displaying Results to User
        toggleLoader(false);
        audioResultSection.classList.remove('hidden');
        showStatus("Voice generated successfully!", "success");

    } catch (error) {
        console.error("Processing Error:", error);
        toggleLoader(false);
        showStatus(`Error: ${error.message || "Something went wrong on the server."}`, "error");
    }
});

// Helper Function: Safe Text Splitter
function splitTextIntoChunks(text, maxLength) {
    const regex = new RegExp(`(.{1,${maxLength}})(?:\\s|$)`, 'g');
    const chunks = text.match(regex) || [text];
    return chunks.map(c => c.trim());
}

// Helper Function: Dynamic API Request to Hugging Face
async function callVoiceAPI(textSegment, modelName) {
    const response = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        // Gradio/FastAPI standard JSON dynamic inputs format
        body: JSON.stringify({
            data: [textSegment, modelName]
        })
    });

    if (!response.ok) {
        throw new Error(`Backend server responded with status code ${response.status}`);
    }

    // Direct binary audio extraction from server response
    const audioBlob = await response.blob();
    return audioBlob;
}

// Helper Function: Audio Merger (Combines multiple blobs into one smooth timeline)
async function mergeAudioBlobs(blobs) {
    // If only 1 chunk, no need to merge, return as is
    if (blobs.length === 1) return blobs[0];

    // standard blob sequence concatenation
    return new Blob(blobs, { type: 'audio/mp3' });
}

// Helper UI Functions
function toggleLoader(show, text = "") {
    if (show) {
        loadingSpinner.classList.remove('hidden');
        loadingText.textContent = text;
        generateBtn.disabled = true;
    } else {
        loadingSpinner.classList.add('hidden');
        generateBtn.disabled = false;
    }
}

function showStatus(msg, type) {
    if (type === "hide") {
        statusMessage.classList.add('hidden');
        return;
    }
    statusMessage.textContent = msg;
    statusMessage.className = `status-msg ${type}`;
}
