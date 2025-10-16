const Script = require("../models/Script");
const jwt = require("jsonwebtoken");

exports.getUserScripts = async (req, res) => {
  // get user scripts
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided (scripts)" });
  }
  const session_id = authHeader.split(" ")[1];

  const decoded = await jwt.decode(session_id, process.env.JWT_SECRET);

  const scripts = await Script.find({ userId: decoded.userId });
  res.json({ success: true, scripts: scripts });
};

exports.saveScript = async (req, res) => {
  // get user scripts
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided (scripts)" });
  }
  const session_id = authHeader.split(" ")[1];
  const { script, title, estimatedDuration, wordCount } = req.body;

  const decoded = await jwt.decode(session_id, process.env.JWT_SECRET);

  const newScript = await Script.create({
    userId: decoded.userId,
    content: script,
    title,
    estimatedDuration,
    wordCount,
  });
  res.json({
    success: true,
    data: {
      scriptId: newScript._id,
      script,
      title,
      estimatedDuration,
      wordCount,
    },
  });
};

exports.getScript = async (req, res) => {
  const { scriptId } = req.query;
  const script = await Script.findOne({ _id: scriptId }).maxTimeMS(50000);
  res.json({ success: true, script: script });
};

exports.deleteScript = async (req, res) => {
  const { id } = req.body;

  await Script.deleteOne({ _id: id });
  res.json({ success: true });
};

exports.updateScript = async (req, res) => {
  // get user scripts

  const { _id, content, title, wordCount, estimatedDuration } = req.body;

  const updatedScript = await Script.findOneAndUpdate(
    { _id: _id },
    { content, title },
    { new: true }
  );
  res.json({
    success: true,
    data: {
      scriptId: updatedScript._id,
      content,
      title,
      estimatedDuration,
      wordCount,
    },
  });
};
