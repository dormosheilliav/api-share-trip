module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    service: "share-trip",
    time: new Date().toISOString(),
  });
};
//https://api-share-trip.vercel.app/api/health
