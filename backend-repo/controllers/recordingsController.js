const jwt = require("jsonwebtoken");
const Recording = require("../models/Recording");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

exports.saveRecording = async (req, res) => {
  // Authentication
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const session_id = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(session_id, process.env.JWT_SECRET);
    if (!decoded?.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  const userId = decoded.userId;

  const videoFile = req.file;
  const { scriptId, duration } = req.body;

  if (!videoFile) {
    return res.status(400).json({ message: "No video file uploaded" });
  }

  try {
    // Upload video to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "recordings", format: "mp4" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(videoFile.buffer);
    });

    const videoUrl = uploadResult.secure_url;
    const cloudinaryPublicId = uploadResult.public_id;
    const thumbnailUrl = cloudinary.url(cloudinaryPublicId, {
      resource_type: "video",
      format: "jpg",
      start_offset: "0",
      quality: "auto:eco",
    });

    // Save to database
    const newRecording = new Recording({
      userId,
      url: videoUrl,
      thumbnailUrl,
      cloudinaryPublicId,
      duration,
      scriptId,
      isImage: false, // videos are not images
       savedDate: new Date(), 
    });

    await newRecording.save();

    res.status(201).json({
      message: "Recording saved successfully",
      recording: {
        _id: newRecording._id,
        url: newRecording.url,
        thumbnailUrl: newRecording.thumbnailUrl,
        duration: newRecording.duration,
       savedDate: newRecording.savedDate,
        isImage: newRecording.isImage,
      },
    });
  } catch (err) {
    console.error("Error saving recording:", err);
    res.status(500).json({ message: "Error uploading video", error: err.message });
  }
};

exports.getSavedRecordings = async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const session_id = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(session_id, process.env.JWT_SECRET);
    if (!decoded?.userId) throw new Error("Invalid token");
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const userId = decoded.userId;

  try {
    const recordings = await Recording.find({ userId });

    // Transform for frontend
    const transformed = recordings.map((rec) => ({
      _id: rec._id,
      url: rec.url,
      thumbnailUrl: rec.thumbnailUrl,
      duration: rec.duration,
      savedDate: rec.savedDate || rec.createdAt, 
      isImage: rec.isImage || false,
    }));

    res.status(200).json({
      message: "Saved recordings retrieved successfully",
      recordings: transformed,
    });
  } catch (err) {
    console.error("Error fetching recordings:", err);
    res.status(500).json({ message: "Error fetching saved recordings", error: err.message });
  }
};

exports.deleteRecording = async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const session_id = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(session_id, process.env.JWT_SECRET);
    if (!decoded?.userId) throw new Error("Invalid token");
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const userId = decoded.userId;
  const { id: recordingId } = req.body;

  try {
    const recording = await Recording.findOne({ _id: recordingId, userId });
    if (!recording) {
      return res.status(404).json({ message: "Recording not found or unauthorized" });
    }

    // Delete from Cloudinary
    if (recording.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(recording.cloudinaryPublicId, { resource_type: "video" });
    }

    // Delete from DB
    await Recording.deleteOne({ _id: recordingId, userId });

    res.status(200).json({ message: "Recording deleted successfully" });
  } catch (err) {
    console.error("Error deleting recording:", err);
    res.status(500).json({ message: "Error deleting recording", error: err.message });
  }
};
