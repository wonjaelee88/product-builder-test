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
const roundEl = document.getElementById("round");
const timerEl = document.getElementById("timer");
const resetBtn = document.getElementById("reset");
const startMatchBtn = document.getElementById("start-match");
const startWebcamBtn = document.getElementById("start-webcam");
const stopWebcamBtn = document.getElementById("stop-webcam");
const webcamContainer = document.getElementById("webcam-container");
const labelContainer = document.getElementById("label-container");
const userImageEl = document.getElementById("user-image");
const computerImageEl = document.getElementById("computer-image");
const userCaptionEl = document.getElementById("user-caption");
const computerCaptionEl = document.getElementById("computer-caption");

let scores = {
  user: 0,
  computer: 0,
  ties: 0
};
let model = null;
let modelLoadingPromise = null;
let webcam = null;
let webcamRunning = false;
let lastWebcamChoice = null;
let currentRound = 0;
let matchActive = false;
let countdownId = null;
let countdownRemaining = 0;

const TOTAL_ROUNDS = 5;
const COUNTDOWN_SECONDS = 3;
const RESULT_PAUSE_MS = 1200;
const CHEER_MESSAGES = {
  win: [
    "Nice! That's a clean win.",
    "Boom. That's your round.",
    "Good read. Keep it up."
  ],
  lose: [
    "Oof. The bot got you.",
    "Close one. Shake it off.",
    "The computer got lucky. Next round."
  ],
  tie: [
    "A perfect mirror. Again!",
    "Stalemate. Run it back.",
    "Same hand energy."
  ]
};

const setStatus = (text) => {
  resultEl.textContent = text;
};

const toDataUri = (svg) => {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const choiceArt = {
  rock: toDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><rect width='160' height='160' rx='24' fill='%23f6efe5'/><circle cx='80' cy='82' r='46' fill='%23706455'/><circle cx='62' cy='70' r='10' fill='%23857563'/><circle cx='98' cy='66' r='8' fill='%23857563'/></svg>"
  ),
  paper: toDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><rect width='160' height='160' rx='24' fill='%23f6efe5'/><rect x='40' y='28' width='80' height='104' rx='10' fill='%23f7f9fb' stroke='%23c4b8ad' stroke-width='4'/><line x1='52' y1='60' x2='108' y2='60' stroke='%23d0c5bc' stroke-width='4'/><line x1='52' y1='80' x2='108' y2='80' stroke='%23d0c5bc' stroke-width='4'/><line x1='52' y1='100' x2='94' y2='100' stroke='%23d0c5bc' stroke-width='4'/></svg>"
  ),
  scissors: toDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><rect width='160' height='160' rx='24' fill='%23f6efe5'/><circle cx='56' cy='56' r='18' fill='none' stroke='%23c5441f' stroke-width='6'/><circle cx='104' cy='56' r='18' fill='none' stroke='%23c5441f' stroke-width='6'/><line x1='64' y1='70' x2='120' y2='128' stroke='%23c5441f' stroke-width='6' stroke-linecap='round'/><line x1='96' y1='70' x2='40' y2='128' stroke='%23c5441f' stroke-width='6' stroke-linecap='round'/></svg>"
  )
};
const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

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
  userImageEl.src = userChoice ? choiceArt[userChoice] : EMPTY_IMAGE;
  computerImageEl.src = computerChoice ? choiceArt[computerChoice] : EMPTY_IMAGE;
  userImageEl.alt = userChoice ? `${formatChoice(userChoice)} choice` : "No choice";
  computerImageEl.alt = computerChoice ? `${formatChoice(computerChoice)} choice` : "No choice";
  userCaptionEl.textContent = userChoice ? formatChoice(userChoice) : "-";
  computerCaptionEl.textContent = computerChoice ? formatChoice(computerChoice) : "-";
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
  let outcome = "";
  let outcomeKey = "";

  if (userChoice === computerChoice) {
    scores.ties += 1;
    outcome = "Tie round.";
    outcomeKey = "tie";
    addHistory(`Tie: ${formatChoice(userChoice)} vs ${formatChoice(computerChoice)}`);
  } else if (beats[userChoice] === computerChoice) {
    scores.user += 1;
    outcome = "You win this round.";
    outcomeKey = "win";
    addHistory(`Win: ${formatChoice(userChoice)} beats ${formatChoice(computerChoice)}`);
  } else {
    scores.computer += 1;
    outcome = "Computer wins this round.";
    outcomeKey = "lose";
    addHistory(`Loss: ${formatChoice(computerChoice)} beats ${formatChoice(userChoice)}`);
  }

  updateScoreboard();
  updateChoices(userChoice, computerChoice);
  return { outcome, outcomeKey, computerChoice };
};

const playRound = (choice) => {
  if (!choice) {
    setStatus("Show your hand to play.");
    return;
  }
  return resolveRound(choice);
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

const getSnapshotChoice = async () => {
  if (!webcam || !model || !webcamRunning) {
    return null;
  }
  webcam.update();
  const predictions = await model.predict(webcam.canvas);
  renderLabels(predictions);
  const best = predictions.reduce((top, current) => {
    return current.probability > top.probability ? current : top;
  }, predictions[0]);
  return normalizeChoice(best.className);
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
    webcam = new tmImage.Webcam(260, 200, true);
    await webcam.setup();
    await webcam.play();
    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);
    webcamRunning = true;
    stopWebcamBtn.disabled = false;
    setAiStatus("Live");
    setStatus("Ready. Start the match to play.");
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
  matchActive = false;
  stopCountdown();
  countdownRemaining = 0;
  updateTimerDisplay();
  startMatchBtn.disabled = false;
};

const updateRoundDisplay = () => {
  roundEl.textContent = currentRound;
};

const getGameStateText = () => {
  return `Score: You ${scores.user} - ${scores.computer} (Ties ${scores.ties})`;
};

const getCheerMessage = (key) => {
  const pool = CHEER_MESSAGES[key] || [];
  if (!pool.length) {
    return "";
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

const updateTimerDisplay = () => {
  timerEl.textContent = countdownRemaining > 0 ? countdownRemaining : "--";
};

const stopCountdown = () => {
  if (countdownId) {
    clearInterval(countdownId);
    countdownId = null;
  }
};

const startCountdown = () => {
  stopCountdown();
  countdownRemaining = COUNTDOWN_SECONDS;
  updateTimerDisplay();
  countdownId = setInterval(() => {
    countdownRemaining -= 1;
    updateTimerDisplay();
    if (countdownRemaining <= 0) {
      stopCountdown();
    }
  }, 1000);
};

const finishMatch = () => {
  matchActive = false;
  startMatchBtn.disabled = false;
  setStatus(`Match complete. ${getGameStateText()}`);
};

const playNextRound = async () => {
  if (!matchActive) {
    return;
  }
  if (currentRound >= TOTAL_ROUNDS) {
    finishMatch();
    return;
  }
  currentRound += 1;
  updateRoundDisplay();
  setStatus(`Round ${currentRound}: get ready...`);
  startCountdown();
  setTimeout(async () => {
    if (!matchActive) {
      return;
    }
    const choice = await getSnapshotChoice();
    if (!choice) {
      setStatus("Could not detect a gesture. Try this round again.");
      currentRound -= 1;
      updateRoundDisplay();
      playNextRound();
      return;
    }
    const result = playRound(choice);
    if (result) {
      const cheer = getCheerMessage(result.outcomeKey);
      const cheerText = cheer ? ` ${cheer}` : "";
      setStatus(
        `Round ${currentRound}: ${result.outcome}${cheerText} ${getGameStateText()}`
      );
    }
    if (currentRound >= TOTAL_ROUNDS) {
      finishMatch();
      return;
    }
    setTimeout(playNextRound, RESULT_PAUSE_MS);
  }, COUNTDOWN_SECONDS * 1000);
};

const startMatch = () => {
  if (!webcamRunning) {
    setStatus("Start the webcam first.");
    return;
  }
  if (matchActive) {
    return;
  }
  resetMatch();
  matchActive = true;
  startMatchBtn.disabled = true;
  playNextRound();
};

const resetMatch = () => {
  scores = { user: 0, computer: 0, ties: 0 };
  updateScoreboard();
  updateChoices(null, null);
  setAiStatus("Idle");
  setStatus("Start the webcam to play.");
  historyEl.innerHTML = "";
  matchActive = false;
  currentRound = 0;
  updateRoundDisplay();
  countdownRemaining = 0;
  updateTimerDisplay();
  stopCountdown();
  startMatchBtn.disabled = false;
};

resetBtn.addEventListener("click", resetMatch);
startWebcamBtn.addEventListener("click", startWebcam);
stopWebcamBtn.addEventListener("click", stopWebcam);
startMatchBtn.addEventListener("click", startMatch);

resetMatch();
