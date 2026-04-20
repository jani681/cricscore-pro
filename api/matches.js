export default async function handler(req, res) {
  const url = "https://cricbuzz-cricket.p.rapidapi.com/matches/v1/recent";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com"
      }
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
}
