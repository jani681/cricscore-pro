async function loadMatch() {
  document.getElementById("result").innerText = "Loading...";

  try {
    const res = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=demo&offset=0");
    const data = await res.json();

    if (data.data && data.data.length > 0) {
      const match = data.data[0];

      let team1 = match.teams[0];
      let team2 = match.teams[1];

      let score = "";

      if (match.score && match.score.length > 0) {
        score = match.score.map(s => 
          `${s.inning}: ${s.r}/${s.w} (${s.o} ov)`
        ).join("\n");
      }

      document.getElementById("result").innerText =
        "🏏 " + team1 + " vs " + team2 + "\n\n" +
        "📊 " + (score || "Score not available") + "\n\n" +
        "📢 " + match.status;

    } else {
      document.getElementById("result").innerText =
        "No live match 😔\n\nPakistan vs India\nStarts soon";
    }

  } catch (error) {
    document.getElementById("result").innerText =
      "Error loading match ❌";
  }
}
