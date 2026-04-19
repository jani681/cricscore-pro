export default function handler(req, res) {
  res.status(200).json({
    team1: "Pakistan",
    team2: "India",
    score: "120/3",
    overs: "15.2"
  });
}
