document.getElementById("loadBtn").onclick = function () {

  const match = {
    team1: "Pakistan",
    team2: "India",
    score: "120/3",
    overs: "15.2"
  };

  document.getElementById("matchContainer").innerHTML = `
    <h3>${match.team1} vs ${match.team2}</h3>
    <p><b>Score:</b> ${match.score}</p>
    <p><b>Overs:</b> ${match.overs}</p>
  `;
};
