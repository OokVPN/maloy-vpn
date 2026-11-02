export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  res.status(200).json({
    ok: false,
    status: "placeholder",
    service: "MaloyVPN",
    message: "This endpoint is not available",
    version: "1.0.0"
  });
}
