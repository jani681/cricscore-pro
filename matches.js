document.addEventListener("DOMContentLoaded", function () {

  document.getElementById("loadBtn").addEventListener("click", async function () {

    const result = document.getElementById("result");
    result.innerText = "Loading...";

    try {
      // ⚠️ TEMP STATIC DATA (backend issue avoid karne ke liye)
      const data = {
        match: "Pakistan vs India",
        score: "250/3 (40 overs)"
      };

      result.innerHTML = `
        <h3>${data.match}</h3>
        <p>${data.score}</p>
      `;

    } catch (err) {
      result.innerText = "Error loading data";
    }

  });

});
