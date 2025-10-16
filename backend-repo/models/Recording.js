const mongoose = require("mongoose");
const { Schema } = mongoose;

const RecordingSchema = new Schema({
  // URL for the main video hosted on Cloudinary
  url: {
    type: String,
    required: true, // This is now required as it holds the video URL
  },

  // Optional: URL for the generated thumbnail, useful for display purposes
  thumbnailUrl: {
    type: String,
    required: false, // Thumbnail might be generated on the fly or might not always exist
  },

  // Cloudinary's public ID for the video, essential for deletion
  cloudinaryPublicId: {
    type: String,
    required: true, // This should be required if you intend to delete files from Cloudinary
  },

  // Duration of the recording in seconds
  duration: {
    type: Number,
    required: true,
    min: 0,
  },

  // Timestamp when the recording was saved to the cloud
  savedDate: {
    type: Date,
    default: Date.now, // Automatically set to current date/time when a new record is created
    required: true,
  },

  // Optional: Reference to the script used for this recording
  // Reference to the Script schema
  scriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Script",
    required: true,
  },

  //   Optional: User who owns this recording
  //   Assuming you have a User model and want to link recordings to users
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to your User model
    required: true,
  },
},
 { timestamps: true }
);

// Create the Mongoose model
module.exports =
  mongoose.models.Recording || mongoose.model("Recording", RecordingSchema);
