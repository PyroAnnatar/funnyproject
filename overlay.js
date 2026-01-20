console.log("Overlay loaded");

// Config

const params = new URLSearchParams(window.location.search);

const PLAYER_NAME = params.get("player") || "Graceful"; // the memeur himself is the default (definitely not to make fun Kappa)
const POLL_MS = Number(params.get("poll")) || 60_000; // abuses the API every minute
const HAS_BOTS = params.get("hasBots") === "true"; // show pve games or not, also good for testing I guess

const API_URL =
  "https://api.bar-rts.com/replays?page=1&limit=24&hasBots=" +
  HAS_BOTS +
  "&endedNormally=true&players=" +
  encodeURIComponent(PLAYER_NAME);

// Initial State

let wins = 0;
let losses = 0;
let streak = 0;

// session anchor (daily stream reset via reload(shut up memegpt))
let lastProcessedMatchId = null;

// Render

function render() {
  document.getElementById("wins").textContent = wins;
  document.getElementById("losses").textContent = losses;

  const streakEl = document.getElementById("streak");

  streakEl.textContent = `${streak > 1 ? `${streak}W Streak` : streak < -1 ? `${Math.abs(streak)}L Streak` : "No Streak"}`;
}

// Manual Abuse Controls

function incWin() {
  wins++;
  streak = streak >= 0 ? streak + 1 : 1;
  render();
}

function decWin() {
  if (wins === 0) return;
  wins--;
  if (streak > 0) streak--;
  render();
}

function incLoss() {
  losses++;
  streak = streak <= 0 ? streak - 1 : -1;
  render();
}

function decLoss() {
  if (losses === 0) return;
  losses--;
  if (streak < 0) streak++;
  render();
}

// API Abuse

async function updateStats() {
  console.log("Abusing API");

  const res = await fetch(API_URL);
  const json = await res.json();

  const matches = json.data;
  if (!matches || matches.length === 0) return;

  // first run → establish session start
  if (lastProcessedMatchId === null) {
    lastProcessedMatchId = matches[0].id;
    console.log("Session started at:", lastProcessedMatchId);
    return;
  }

  // no new games → chill (what a zoomer)
  if (matches[0].id === lastProcessedMatchId) {
    console.log("No new matches (Sadge)");
    return;
  }

  const newMatches = [];

  for (const match of matches) {
    if (match.id === lastProcessedMatchId) break;
    newMatches.push(match);
  }

  // oldest → newest so streak makes sense
  newMatches.reverse();

  for (const match of newMatches) {
    let playerTeam = null;

    for (const team of match.AllyTeams) {
      if (team.Players.some((p) => p.name === PLAYER_NAME)) {
        playerTeam = team;
        break;
      }
    }

    if (!playerTeam) continue;
    const mapName =
      match.Map && match.Map.scriptName
        ? match.Map.scriptName
        : "Unknown map or fail";

    if (playerTeam.winningTeam) {
      wins++;
      streak = streak >= 0 ? streak + 1 : 1;
      console.log("WIN", mapName, match.id);
    } else {
      losses++;
      streak = streak <= 0 ? streak - 1 : -1;
      console.log("LOSS", mapName, match.id);
    }
  }

  lastProcessedMatchId = matches[0].id;
  render();
}

// initial booty

render();
updateStats();
setInterval(updateStats, POLL_MS);
