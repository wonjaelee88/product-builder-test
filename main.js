const choices = ["rock", "paper", "scissors"];
const MODEL_BASE_URL = "https://teachablemachine.withgoogle.com/models/MvR5Y3bz7/";
const MODEL_URL = `${MODEL_BASE_URL}model.json`;
const METADATA_URL = `${MODEL_BASE_URL}metadata.json`;
const beats = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper"
};

const userScoreEl = document.getElementById("user-score");
const computerScoreEl = document.getElementById("computer-score");
const tieScoreEl = document.getElementById("tie-score");
const userChoiceEl = document.getElementById("user-choice");
const computerChoiceEl = document.getElementById("computer-choice");
const resultEl = document.getElementById("result");
const historyEl = document.getElementById("history");
const aiStatusEl = document.getElementById("ai-status");
const previewEl = document.getElementById("preview");
const detectBtn = document.getElementById("detect");
const playDetectedBtn = document.getElementById("play-detected");
const resetBtn = document.getElementById("reset");
const fileInput = document.getElementById("hand-image");
const startWebcamBtn = document.getElementById("start-webcam");
const stopWebcamBtn = document.getElementById("stop-webcam");
const webcamContainer = document.getElementById("webcam-container");
const labelContainer = document.getElementById("label-container");

let scores = {
  user: 0,
  computer: 0,
  ties: 0
};
let detectedChoice = null;
let lastUserChoice = null;
let model = null;
let modelLoadingPromise = null;
let webcam = null;
let webcamRunning = false;
let maxPredictions = 0;
let lastWebcamChoice = null;

const setStatus = (text) => {
  resultEl.textContent = text;
};

const updateScoreboard = () => {
  userScoreEl.textContent = scores.user;
  computerScoreEl.textContent = scores.computer;
  tieScoreEl.textContent = scores.ties;
};

const formatChoice = (choice) => {
  if (!choice) {
    return "-";
  }
  if (choice === "scissors") {
    return "Scissor";
  }
  return choice.charAt(0).toUpperCase() + choice.slice(1);
};

const updateChoices = (userChoice, computerChoice) => {
  userChoiceEl.textContent = formatChoice(userChoice);
  computerChoiceEl.textContent = formatChoice(computerChoice);
};

const addHistory = (text) => {
  const item = document.createElement("li");
  item.textContent = text;
  historyEl.prepend(item);
  if (historyEl.children.length > 5) {
    historyEl.removeChild(historyEl.lastChild);
  }
};

const getComputerChoice = () => {
  return choices[Math.floor(Math.random() * choices.length)];
};

const resolveRound = (userChoice) => {
  const computerChoice = getComputerChoice();

  if (userChoice === computerChoice) {
    scores.ties += 1;
    setStatus("Tie round. Try again.");
    addHistory(`Tie: ${formatChoice(userChoice)} vs ${formatChoice(computerChoice)}`);
  } else if (beats[userChoice] === computerChoice) {
    scores.user += 1;
    setStatus("You win this round.");
    addHistory(`Win: ${formatChoice(userChoice)} beats ${formatChoice(computerChoice)}`);
  } else {
    scores.computer += 1;
    setStatus("Computer wins this round.");
    addHistory(`Loss: ${formatChoice(computerChoice)} beats ${formatChoice(userChoice)}`);
  }

  updateScoreboard();
  updateChoices(userChoice, computerChoice);
};

const selectChoice = (choice) => {
  lastUserChoice = choice;
  document.querySelectorAll(".choice").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.choice === choice);
  });
};

const playRound = (choice) => {
  if (!choice) {
    setStatus("Pick a move first.");
    return;
  }
  selectChoice(choice);
  resolveRound(choice);
};

const setAiStatus = (text) => {
  aiStatusEl.textContent = text;
};

const ensureModelLoaded = async () => {
  if (model) {
    return model;
  }
  if (!modelLoadingPromise) {
    modelLoadingPromise = tmImage.load(MODEL_URL, METADATA_URL);
  }
  model = await modelLoadingPromise;
  return model;
};

const fileToImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const normalizeChoice = (label) => {
  const normalized = label.trim().toLowerCase();
  if (normalized === "scissor") {
    return "scissors";
  }
  if (choices.includes(normalized)) {
    return normalized;
  }
  return null;
};

const classifyHandImage = async (file) => {
  const loadedModel = await ensureModelLoaded();
  const img = await fileToImage(file);
  const predictions = await loadedModel.predict(img);
  const best = predictions.reduce((top, current) => {
    return current.probability > top.probability ? current : top;
  }, predictions[0]);
  return normalizeChoice(best.className);
};

const renderLabels = (predictions) => {
  if (!labelContainer) {
    return;
  }
  labelContainer.innerHTML = "";
  predictions.forEach((prediction) => {
    const row = document.createElement("div");
    row.textContent = `${prediction.className}: ${prediction.probability.toFixed(2)}`;
    labelContainer.appendChild(row);
  });
};

const updateWebcamPrediction = async () => {
  if (!webcam || !model || !webcamRunning) {
    return;
  }
  webcam.update();
  const predictions = await model.predict(webcam.canvas);
  renderLabels(predictions);
  const best = predictions.reduce((top, current) => {
    return current.probability > top.probability ? current : top;
  }, predictions[0]);
  lastWebcamChoice = normalizeChoice(best.className);
};

const webcamLoop = async () => {
  if (!webcamRunning) {
    return;
  }
  await updateWebcamPrediction();
  requestAnimationFrame(webcamLoop);
};

const startWebcam = async () => {
  setAiStatus("Loading");
  startWebcamBtn.disabled = true;
  stopWebcamBtn.disabled = true;
  try {
    const loadedModel = await ensureModelLoaded();
    model = loadedModel;
    maxPredictions = model.getTotalClasses();
    webcam = new tmImage.Webcam(260, 200, true);
    await webcam.setup();
    await webcam.play();
    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);
    webcamRunning = true;
    stopWebcamBtn.disabled = false;
    setAiStatus("Live");
    webcamLoop();
  } catch (error) {
    setAiStatus("Error");
    setStatus("Webcam unavailable. Check permissions.");
  } finally {
    startWebcamBtn.disabled = false;
  }
};

const stopWebcam = () => {
  if (webcam) {
    webcam.stop();
  }
  webcamRunning = false;
  lastWebcamChoice = null;
  webcamContainer.innerHTML = "<span>Webcam idle</span>";
  labelContainer.innerHTML = "";
  stopWebcamBtn.disabled = true;
  setAiStatus("Idle");
};

const updatePreview = (file) => {
  if (!file) {
    previewEl.innerHTML = "<span>No image selected</span>";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    previewEl.innerHTML = "";
    const img = document.createElement("img");
    img.src = reader.result;
    previewEl.appendChild(img);
  };
  reader.readAsDataURL(file);
};

const detectGesture = async () => {
  const file = fileInput.files[0];
  if (!file && !webcamRunning) {
    setStatus("Upload a hand image to detect a gesture.");
    return;
  }

  setAiStatus("Loading");
  detectBtn.disabled = true;
  playDetectedBtn.disabled = true;
  setStatus("Classifier running...");

  try {
    if (webcamRunning) {
      await updateWebcamPrediction();
      detectedChoice = lastWebcamChoice;
    } else {
      detectedChoice = await classifyHandImage(file);
    }
    if (!detectedChoice) {
      setAiStatus("Unknown");
      setStatus("Classifier result not recognized. Use rock/paper/scissors labels.");
      return;
    }
    setAiStatus("Detected");
    playDetectedBtn.disabled = false;
    setStatus(`Detected ${detectedChoice}. Ready to play.`);
  } catch (error) {
    detectedChoice = null;
    setAiStatus("Error");
    setStatus("Classifier failed. Try again.");
  } finally {
    detectBtn.disabled = false;
  }
};

const resetMatch = () => {
  scores = { user: 0, computer: 0, ties: 0 };
  detectedChoice = null;
  lastUserChoice = null;
  updateScoreboard();
  updateChoices(null, null);
  setAiStatus("Idle");
  setStatus("Make your move.");
  playDetectedBtn.disabled = true;
  historyEl.innerHTML = "";
  document.querySelectorAll(".choice").forEach((btn) => {
    btn.classList.remove("selected");
  });
};

document.querySelectorAll(".choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    playRound(btn.dataset.choice);
  });
});

detectBtn.addEventListener("click", detectGesture);

playDetectedBtn.addEventListener("click", () => {
  if (!detectedChoice) {
    setStatus("Run detection first.");
    return;
  }
  playRound(detectedChoice);
});

resetBtn.addEventListener("click", resetMatch);
startWebcamBtn.addEventListener("click", startWebcam);
stopWebcamBtn.addEventListener("click", stopWebcam);

fileInput.addEventListener("change", () => {
  updatePreview(fileInput.files[0]);
  detectedChoice = null;
  setAiStatus("Idle");
  playDetectedBtn.disabled = true;
});

resetMatch();
