async function loadMatch() {
  document.getElementById("result").innerText = "Loading...";

  try {
    const res = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=demo&offset=0");
    const data = await res.json();

    if (data.data && data.data.length > 0) {
      const match = data.data[0];

      document.getElementById("result").innerText =
        match.name + "\n" + match.status;
    } else {
      document.getElementById("result").innerText = "No match found";
    }
  } catch (error) {
    document.getElementById("result").innerText = "Error loading match";
  }
}
