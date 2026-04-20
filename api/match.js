
export default async function handler(req, res) {
  try {
    res.status(200).json({
      message: "API Working ✅"
    });
  } catch (error) {
    res.status(500).json({
      error: "API Error"
    });
  }
}
