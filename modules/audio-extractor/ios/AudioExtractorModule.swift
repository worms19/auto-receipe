import ExpoModulesCore
import AVFoundation

public class AudioExtractorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioExtractor")

    AsyncFunction("extractAudio") { (videoUri: String, outputUri: String, promise: Promise) in
      guard let videoURL = URL(string: videoUri) else {
        promise.reject("INVALID_URL", "Invalid video URI: \(videoUri)")
        return
      }

      guard let outputURL = URL(string: outputUri) else {
        promise.reject("INVALID_URL", "Invalid output URI: \(outputUri)")
        return
      }

      let asset = AVAsset(url: videoURL)

      guard let exportSession = AVAssetExportSession(
        asset: asset,
        presetName: AVAssetExportPresetAppleM4A
      ) else {
        promise.reject("EXPORT_FAILED", "Cannot create audio export session")
        return
      }

      exportSession.outputFileType = .m4a
      exportSession.outputURL = outputURL

      exportSession.exportAsynchronously {
        switch exportSession.status {
        case .completed:
          promise.resolve(outputURL.absoluteString)
        case .failed:
          promise.reject(
            "EXPORT_FAILED",
            exportSession.error?.localizedDescription ?? "Audio extraction failed"
          )
        case .cancelled:
          promise.reject("EXPORT_CANCELLED", "Audio extraction was cancelled")
        default:
          promise.reject(
            "EXPORT_FAILED",
            "Audio extraction failed with status: \(exportSession.status.rawValue)"
          )
        }
      }
    }
  }
}
