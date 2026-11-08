import { useRef, useState, useEffect } from 'react';
import { Pause, Square, Volume2, ShieldAlert, Trash2, Sparkles, AlertCircle, Video } from 'lucide-react';

const LANGUAGES = [
	{ name: 'English', code: 'en', locale: 'en-US' },
	{ name: 'Telugu (తెలుగు)', code: 'te', locale: 'te-IN' },
	{ name: 'Hindi (हिन्दी)', code: 'hi', locale: 'hi-IN' },
	{ name: 'Tamil (தமிழ்)', code: 'ta', locale: 'ta-IN' },
	{ name: 'Malayalam (മലയാളം)', code: 'ml', locale: 'ml-IN' },
	{ name: 'Urdu (اردو)', code: 'ur', locale: 'ur-PK' },
	{ name: 'Kannada (ಕನ್ನಡ)', code: 'kn', locale: 'kn-IN' },
	{ name: 'Bengali (বাংলা)', code: 'bn', locale: 'bn-IN' }
];

export default function TranslatorStudio({ user, onNewTranslationAdded }) {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);

	const [cameraActive, setCameraActive] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Real-time AI Predictions
	const [currentGesture, setCurrentGesture] = useState('Waiting...');
	const [confidence, setConfidence] = useState(0.0);
	const [accumulatedWords, setAccumulatedWords] = useState([]);
	const [translatedSentence, setTranslatedSentence] = useState('');
	const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]); // Default: English

	// Speech controls
	const [speechState, setSpeechState] = useState('stopped'); // 'speaking', 'paused', 'stopped'
	const speechUtteranceRef = useRef(null);

	// Custom bonus feature tabs/panels
	const [emergencyMode, setEmergencyMode] = useState(false);
	const [chatbotOpen, setChatbotOpen] = useState(false);
	const [chatMessages, setChatMessages] = useState([
		{ sender: 'bot', text: 'Hi! I am your SignConnect AI assistant. Ask me anything about Indian Sign Language (ISL) or how to use this app.' }
	]);
	const [chatInput, setChatInput] = useState('');

	// MediaPipe references
	const handsRef = useRef(null);
	const cameraRef = useRef(null);
		const lastPredictTime = useRef(0);

	// Initialize MediaPipe Hands
	useEffect(() => {
		if (typeof window.Hands === 'undefined') {
			setError('MediaPipe Hands library not loaded. Please verify your internet connection.');
			return;
		}

		try {
			const hands = new window.Hands({
				locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
			});

			hands.setOptions({
				maxNumHands: 1,
				modelComplexity: 1,
				minDetectionConfidence: 0.65,
				minTrackingConfidence: 0.65
			});

			hands.onResults(handleHandResults);
			handsRef.current = hands;
		} catch (err) {
			setError(`Failed to initialize MediaPipe Hands: ${err.message}`);
		}

		return () => {
			stopCamera();
		};
	}, []);

	// Handle hand landmarks from MediaPipe
	const handleHandResults = async (results) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
			const landmarks = results.multiHandLandmarks[0];

			// Draw hand skeleton
			if (window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
				window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#6366f1', lineWidth: 4 });
				window.drawLandmarks(ctx, landmarks, { color: '#ec4899', lineWidth: 1, radius: 4 });
			}

			// Throttle server prediction API calls to 2.5 FPS (every 400ms) to ensure smooth performance
			const now = Date.now();
			if (now - lastPredictTime.current > 400) {
				lastPredictTime.current = now;
				await predictGesture(landmarks);
			}
		} else {
			// Fade confidence slowly if no hand detected
			setConfidence((prev) => Math.max(0, prev - 0.05));
		}
	};

	// Call Flask API to predict gesture from landmarks coordinates
	const predictGesture = async (landmarks) => {
		try {
			const response = await fetch('/api/predict', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ landmarks })
			});

			if (!response.ok) return;

			const data = await response.json();
			if (data.gesture) {
				// Update HUD immediately to show live AI predictions and confidence
				setCurrentGesture(data.gesture);
				setConfidence(data.confidence);

				// Build sentence logs only if confidence is solid
				if (data.confidence > 0.5) {
					setAccumulatedWords((prev) => {
						if (prev.length === 0 || prev[prev.length - 1] !== data.gesture) {
							return [...prev, data.gesture];
						}
						return prev;
					});
				}
			}
		} catch (err) {
			console.error('Error calling prediction API:', err);
		}
	};

	// Perform translation on accumulated words when selection changes or words update
	useEffect(() => {
		if (accumulatedWords.length === 0) {
			setTranslatedSentence('');
			return;
		}

		const translateSentence = async () => {
			const sentence = accumulatedWords.join(' ');

			if (selectedLang.code === 'en') {
				setTranslatedSentence(sentence);
				return;
			}

			try {
				const response = await fetch('/api/translate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: sentence, language: selectedLang.code })
				});

				if (response.ok) {
					const data = await response.json();
					setTranslatedSentence(data.translated_text);
				}
			} catch (err) {
				console.error('Translation error:', err);
				setTranslatedSentence(sentence); // Fallback to raw English
			}
		};

		translateSentence();
	}, [accumulatedWords, selectedLang]);

	// Start Camera
	const startCamera = async () => {
		setError(null);
		setLoading(true);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { width: 640, height: 480 }
			});

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				videoRef.current.play();
			}

			// Initialize MediaPipe Camera helper
			if (window.Camera && handsRef.current) {
				const camera = new window.Camera(videoRef.current, {
					onFrame: async () => {
						if (videoRef.current) {
							await handsRef.current.send({ image: videoRef.current });
						}
					},
					width: 640,
					height: 480
				});
				cameraRef.current = camera;
				camera.start();
			}
			setCameraActive(true);
		} catch (err) {
			setError('Could not access camera. Please grant camera permissions in your browser.');
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	// Stop Camera
	const stopCamera = () => {
		if (videoRef.current && videoRef.current.srcObject) {
			const tracks = videoRef.current.srcObject.getTracks();
			tracks.forEach((track) => track.stop());
			videoRef.current.srcObject = null;
		}
		if (cameraRef.current) {
			try {
				cameraRef.current.stop();
			} catch (err) {
				console.error('Camera stop error:', err);
			}
			cameraRef.current = null;
		}
		setCameraActive(false);

		// Clear drawing canvas
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	};

	// Web Speech synthesis TTS helper
	const handleSpeak = () => {
		if (!translatedSentence) return;

		// If speaking, pause. If paused, resume. Else start fresh.
		if (speechState === 'speaking') {
			window.speechSynthesis.pause();
			setSpeechState('paused');
			return;
		} else if (speechState === 'paused') {
			window.speechSynthesis.resume();
			setSpeechState('speaking');
			return;
		}

		// Cancel existing
		window.speechSynthesis.cancel();

		const utterance = new SpeechSynthesisUtterance(translatedSentence);

		// Map voice locale
		utterance.lang = selectedLang.locale;

		// Find matching regional voice if available
		const voices = window.speechSynthesis.getVoices();
		const voice = voices.find(v => v.lang.startsWith(selectedLang.code));
		if (voice) utterance.voice = voice;

		utterance.onend = () => {
			setSpeechState('stopped');
		};
		utterance.onerror = () => {
			setSpeechState('stopped');
		};

		speechUtteranceRef.current = utterance;
		window.speechSynthesis.speak(utterance);
		setSpeechState('speaking');
	};

	const handleStopSpeech = () => {
		window.speechSynthesis.cancel();
		setSpeechState('stopped');
	};

	// Clear accumulated translation sentence
	const handleClearText = () => {
		setAccumulatedWords([]);
		setCurrentGesture('Waiting...');
		setConfidence(0.0);
		handleStopSpeech();
	};

	// Save current translation log to History Database
	const handleSaveToHistory = async () => {
		if (accumulatedWords.length === 0) return;

		try {
			const response = await fetch('/api/history', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-user-id': user?.user_id || ''
				},
				body: JSON.stringify({
					detected_text: accumulatedWords.join(' '),
					translated_text: translatedSentence,
					language: selectedLang.name
				})
			});

			if (response.ok) {
				await response.json();
				// Notify parent to update dashboard metrics
				if (onNewTranslationAdded) onNewTranslationAdded();

				// UI confirmation
				const saveBtn = document.getElementById('save-history-btn');
				if (saveBtn) {
					const originalHTML = saveBtn.innerHTML;
					saveBtn.innerHTML = `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>Saved!</span>`;
					setTimeout(() => {
						saveBtn.innerHTML = originalHTML;
					}, 2000);
				}
			}
		} catch (err) {
			console.error('Save translation error:', err);
		}
	};

	// Emergency Mode triggers
	const handleEmergencyTrigger = () => {
		setEmergencyMode((prev) => {
			const next = !prev;
			if (next) {
				// Build emergency words
				setAccumulatedWords(["Emergency", "Help", "I need water"]);
				setSelectedLang(LANGUAGES.find(l => l.code === 'hi') || LANGUAGES[0]); // Translate to Hindi
				// Synthesise emergency warning
				setTimeout(() => {
					window.speechSynthesis.cancel();
					const warning = new SpeechSynthesisUtterance("Emergency Alert! Need immediate assistance.");
					warning.rate = 1.1;
					warning.volume = 1.0;
					window.speechSynthesis.speak(warning);
				}, 300);
			} else {
				handleClearText();
			}
			return next;
		});
	};

	// Chatbot submit
	const handleChatSubmit = (e) => {
		e.preventDefault();
		if (!chatInput.trim()) return;

		const userMsg = { sender: 'user', text: chatInput };
		setChatMessages(prev => [...prev, userMsg]);
		setChatInput('');

		// Generate responsive bot response based on keywords
		setTimeout(() => {
			const query = chatInput.toLowerCase();
			let reply = "I'm sorry, I'm still learning that gesture. Could you rephrase?";

			if (query.includes('how to use') || query.includes('guide')) {
				reply = "Start the webcam, place your hand inside the camera box, and make gestures. The system will detect hand landmarks and predict the signs. Change the dropdown to translate to Hindi, Tamil, Telugu, etc.";
			} else if (query.includes('isl') || query.includes('indian sign language')) {
				reply = "Indian Sign Language (ISL) is the sign language used in India. It utilizes unique double-handed and single-handed gestures. This AI leverages landmarks to match gestures with high accuracy.";
			} else if (query.includes('emergency')) {
				reply = "Emergency mode triggers red visuals and speaks out 'Emergency Alert' in high volume. Click the Red Shield button to activate it.";
			} else if (query.includes('languages') || query.includes('translate')) {
				reply = "We support translation into Telugu, Hindi, Tamil, Malayalam, Urdu, Kannada, and Bengali. Choose your language from the dropdown.";
			} else if (query.includes('accuracy')) {
				reply = "Our neural network model operates at approximately 96.5% accuracy when translating normalized hand landmark coordinates.";
			}

			setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
		}, 800);
	};

	return (
		<div className={`p-6 max-w-7xl mx-auto transition-all duration-300 ${emergencyMode ? 'bg-rose-950/20' : ''}`}>

			{/* Page Title & Emergency Alert banner */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
				<div>
					<h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
						Translator Studio
						<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse">
							Live
						</span>
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
						Capture webcam hand gestures to interpret, translate, and synthesize speech.
					</p>
				</div>

				<div className="flex items-center gap-2">
					{/* Emergency Shield Button */}
					<button
						id="emergency-trigger-btn"
						onClick={handleEmergencyTrigger}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all duration-300 cursor-pointer ${
							emergencyMode
								? 'bg-rose-600 text-white animate-bounce shadow-rose-500/30'
								: 'bg-white dark:bg-slate-900 text-rose-500 border border-rose-200 dark:border-rose-950 hover:bg-rose-50 dark:hover:bg-rose-950/30'
						}`}
					>
						<ShieldAlert className="w-5 h-5" />
						{emergencyMode ? "CANCEL EMERGENCY" : "EMERGENCY BROADCAST"}
					</button>
				</div>
			</div>

			{/* Main Grid Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

				{/* Left Column: Camera View */}
				<div className="lg:col-span-7 flex flex-col gap-4">
					<div className="relative aspect-video rounded-2xl overflow-hidden glass-panel bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-lg flex items-center justify-center">

						{/* Webcam Video feed */}
						<video
							ref={videoRef}
							className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
							playsInline
							muted
						/>

						{/* Drawing Canvas overlay */}
						<canvas
							ref={canvasRef}
							width="640"
							height="480"
							className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none z-10"
						/>

						{/* Placeholder / Permission States */}
						{!cameraActive && (
							<div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-slate-950/90 text-white">
								{loading ? (
									<div className="flex flex-col items-center gap-3">
										<div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
										<p className="text-sm font-medium">Accessing camera stream...</p>
									</div>
								) : error ? (
									<div className="flex flex-col items-center gap-3 max-w-sm">
										<div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
											<AlertCircle className="w-6 h-6" />
										</div>
										<p className="text-sm font-semibold text-rose-400">{error}</p>
										<button
											onClick={startCamera}
											className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
										>
											Request Permissions Again
										</button>
									</div>
								) : (
									<div className="flex flex-col items-center gap-4">
										<div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse-ring">
											<Video className="w-7 h-7" />
										</div>
										<div>
											<h3 className="text-base font-bold">Camera Stream Inactive</h3>
											<p className="text-xs text-slate-400 mt-1 max-w-xs">
												Enable browser camera permissions to trace hand landmarks and predict signs.
											</p>
										</div>
										<button
											id="camera-activation-btn"
											onClick={startCamera}
											className="px-5 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all shadow-md shadow-indigo-500/20 active:scale-98 cursor-pointer"
										>
											Start Camera Feed
										</button>
									</div>
								)}
							</div>
						)}

						{/* Gesture Detection HUD (Visible when camera is active) */}
						{cameraActive && (
							<div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
								<span>HUD: ML INFERENCE RUNNING</span>
							</div>
						)}

						{/* Predict HUD */}
						{cameraActive && (
							<div className="absolute bottom-4 right-4 z-20 p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 text-white min-w-[200px]">
								<p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Live Gesture</p>
								<h3 className="text-2xl font-extrabold text-indigo-400 mt-0.5">{currentGesture}</h3>
								<div className="mt-2.5 flex items-center justify-between">
									<span className="text-[10px] text-slate-400">Model Confidence</span>
									<span className="text-xs font-bold text-emerald-400">{(confidence * 100).toFixed(1)}%</span>
								</div>
								{/* Confidence Bar */}
								<div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
									<div
										className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
										style={{ width: `${confidence * 100}%` }}
									/>
								</div>
							</div>
						)}

					</div>

					{/* Camera controls toolbar */}
					{cameraActive && (
						<div className="flex items-center justify-between p-3.5 glass-panel bg-white/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-md">
							<span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
								<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
								Camera Active (640x480)
							</span>
							<button
								id="camera-stop-btn"
								onClick={stopCamera}
								className="px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition-all border border-rose-500/20 cursor-pointer"
							>
								Stop Camera
							</button>
						</div>
					)}

				</div>

				{/* Right Column: Translations & Logs */}
				<div className="lg:col-span-5 flex flex-col gap-6">

					{/* Main Translator Panel */}
					<div className="flex-1 glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg flex flex-col relative">

						{/* Language Selector Dropdown */}
						<div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4 mb-4">
							<div>
								<label htmlFor="language-select" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
									Target Language
								</label>
								<select
									id="language-select"
									value={selectedLang.code}
									onChange={(e) => {
										const selected = LANGUAGES.find(l => l.code === e.target.value);
										if (selected) setSelectedLang(selected);
									}}
									className="block mt-1 bg-transparent border-none text-base font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
								>
									{LANGUAGES.map((lang) => (
										<option key={lang.code} value={lang.code} className="dark:bg-slate-900 text-slate-800 dark:text-white">
											{lang.name}
										</option>
									))}
								</select>
							</div>

							{/* Clear button */}
							<button
								id="clear-translation-btn"
								onClick={handleClearText}
								disabled={accumulatedWords.length === 0}
								className="p-2.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
								title="Clear sentence"
							>
								<Trash2 className="w-5 h-5" />
							</button>
						</div>

						{/* Translation Output boxes */}
						<div className="flex-1 flex flex-col gap-4">

							{/* Detected English Text */}
							<div className="flex-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 min-h-[100px] flex flex-col">
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detected Sign Sequence (English)</span>
								<p className="text-base font-semibold text-slate-800 dark:text-slate-100 flex-1 leading-relaxed">
									{accumulatedWords.length > 0 ? (
										accumulatedWords.map((word, idx) => (
											<span key={idx} className="inline-block bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md text-xs font-semibold mr-1.5 mb-1.5 border border-indigo-100/50 dark:border-indigo-950 animate-fade-in">
												{word}
											</span>
										))
									) : (
										<span className="text-sm font-normal text-slate-400 italic">No gestures captured yet. Start camera and place hand in frame.</span>
									)}
								</p>
							</div>

							{/* Translated Text Box */}
							<div className="flex-1 p-4 rounded-xl bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/10 dark:to-purple-950/10 border border-indigo-100/60 dark:border-indigo-950/60 min-h-[100px] flex flex-col">
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Translated Text Output</span>
								<p className="text-lg font-extrabold text-slate-800 dark:text-white flex-1 leading-relaxed">
									{translatedSentence || (
										<span className="text-sm font-normal text-slate-400 italic">Waiting for translation output...</span>
									)}
								</p>
							</div>

						</div>

						{/* Audio Synthesis & Actions Toolbar */}
						<div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200/60 dark:border-slate-800/60 pt-4">

							{/* Audio synth controls */}
							<div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
								<button
									id="btn-speak-text"
									onClick={handleSpeak}
									disabled={!translatedSentence}
									className="p-2 bg-white dark:bg-slate-900 text-indigo-500 hover:text-indigo-600 disabled:opacity-40 rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
									title={speechState === 'speaking' ? "Pause Speech" : "Speak text"}
								>
									{speechState === 'speaking' ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
								</button>
								<button
									id="btn-stop-speak"
									onClick={handleStopSpeech}
									disabled={speechState === 'stopped'}
									className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 rounded-lg active:scale-95 transition-all cursor-pointer"
									title="Stop Speech"
								>
									<Square className="w-4 h-4" />
								</button>
							</div>

							{/* Copy Sentence */}
							<button
								onClick={() => {
									if (translatedSentence) {
										navigator.clipboard.writeText(translatedSentence);
										const copyBtn = document.getElementById('copy-sentence-btn');
										if (copyBtn) {
											copyBtn.innerHTML = '<span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Copied</span>';
											setTimeout(() => {
												copyBtn.innerHTML = 'Copy Text';
											}, 1500);
										}
									}
								}}
								id="copy-sentence-btn"
								disabled={!translatedSentence}
								className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/40 shadow-sm cursor-pointer transition-all"
							>
								Copy Text
							</button>

							{/* Save log button */}
							<button
								id="save-history-btn"
								onClick={handleSaveToHistory}
								disabled={accumulatedWords.length === 0}
								className="ml-auto px-4 py-2 bg-gradient-to-tr from-indigo-500 to-purple-600 hover:brightness-105 text-white disabled:opacity-50 rounded-xl text-xs font-extrabold shadow-md shadow-indigo-500/20 active:scale-98 cursor-pointer transition-all"
							>
								Save Translation
							</button>

						</div>

					</div>

					{/* AI Chatbot Assistant drawer (Bonus Feature) */}
					<div className="glass-panel bg-white/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg overflow-hidden">
						<button
							onClick={() => setChatbotOpen(!chatbotOpen)}
							className="w-full flex items-center justify-between p-4 font-bold text-sm text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all"
						>
							<span className="flex items-center gap-2">
								<Sparkles className="w-5 h-5 text-indigo-500" />
								SignConnect AI Chatbot Assistant
							</span>
							<span className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
								{chatbotOpen ? "Close" : "Open Help Chat"}
							</span>
						</button>

						{chatbotOpen && (
							<div className="border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col h-[260px]">
								{/* Chat Messages */}
								<div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
									{chatMessages.map((msg, idx) => (
										<div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
											<div
												className={`max-w-[80%] p-3 rounded-2xl leading-relaxed shadow-sm ${
													msg.sender === 'user'
														? 'bg-indigo-600 text-white rounded-br-none'
														: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-none'
												}`}
											>
												{msg.text}
											</div>
										</div>
									))}
								</div>

								{/* Chat Form */}
								<form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 flex gap-2">
									<input
										type="text"
										placeholder="Ask about sign codes, emergency mode..."
										value={chatInput}
										onChange={(e) => setChatInput(e.target.value)}
										className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
									/>
									<button
										type="submit"
										className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center cursor-pointer active:scale-95"
									>
										Send
									</button>
								</form>
							</div>
						)}
					</div>

				</div>

			</div>

		</div>
	);
}
