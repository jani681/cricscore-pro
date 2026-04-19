export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://cricbuzz-cricket2.p.rapidapi.com/mcenter/v1/100238/oversGraph",
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": "45de809bc2mshae44e2328038bd2p15397djsn434507fd5798",
          "X-RapidAPI-Host": "cricbuzz-cricket2.p.rapidapi.com",
        },
      }
    );

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Something went wrong",
      details: error.message,
    });
  }
}
