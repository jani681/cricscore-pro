document.getElementById("loadBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  status.innerText = "Loading...";

  try {
    const res = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=demo&offset=0");
    const data = await res.json();

    if (data.data && data.data.length > 0) {
      status.innerText = JSON.stringify(data.data[0], null, 2);
    } else {
      status.innerText = "No matches found";
    }
  } catch (err) {
      status.innerText = "Error loading data";
  }
});
