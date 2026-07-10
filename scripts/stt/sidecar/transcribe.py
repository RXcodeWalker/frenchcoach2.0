#!/usr/bin/env python3
"""
S3 whisperX sidecar. Thin wrapper: forced French, word-level alignment scores,
pyannote diarization. Emits exactly one JSON blob on stdout matching the
RawAsrResult contract in src/domain/igcse/stt/types.ts — the TS provider
(whisperXProvider.ts) normalises nothing further, so any resolved model,
aligner, diarizer, or decode-config detail must be produced here.

Usage:
  python transcribe.py --audio <path> --hf-token <token> [--model large-v3]

All stderr is progress/logging; stdout is exclusively the JSON result.
"""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone

MODEL_NAME = "large-v3"
ALIGNMENT_MODEL_NAME = "wav2vec2-fr-align"  # whisperX's default fr alignment model
DIARIZATION_MODEL_NAME = "pyannote/speaker-diarization-3.1"
LANGUAGE_CODE = "fr"


def resolved_decode_params(model: str) -> dict:
    return {
        "model": model,
        "language": LANGUAGE_CODE,
        "beam_size": 5,
        "temperature": 0.0,
        "condition_on_previous_text": False,
        "vad_filter": True,
    }


def decode_params_hash(params: dict) -> str:
    canonical = json.dumps(params, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def run_pipeline(audio_path: str, hf_token: str, model_name: str) -> dict:
    import whisperx  # imported lazily so --help works without the heavy deps installed

    device = "cuda" if whisperx.utils.is_cuda_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"

    decode_params = resolved_decode_params(model_name)

    asr_model = whisperx.load_model(model_name, device, compute_type=compute_type, language=LANGUAGE_CODE)
    audio = whisperx.load_audio(audio_path)
    transcription = asr_model.transcribe(audio, batch_size=16, language=LANGUAGE_CODE)

    align_model, align_metadata = whisperx.load_align_model(language_code=LANGUAGE_CODE, device=device)
    aligned = whisperx.align(
        transcription["segments"], align_model, align_metadata, audio, device, return_char_alignments=False
    )

    diarize_model = whisperx.DiarizationPipeline(use_auth_token=hf_token, device=device)
    diarization = diarize_model(audio_path, min_speakers=2, max_speakers=2)
    result = whisperx.assign_word_speakers(diarization, aligned)

    words = []
    for segment in result["segments"]:
        for word in segment.get("words", []):
            if "start" not in word or "end" not in word:
                # whisperX occasionally emits an unaligned word with no timing; skip it
                # rather than fabricating a span.
                continue
            words.append(
                {
                    "text": word["word"].strip(),
                    "startS": round(float(word["start"]), 3),
                    "endS": round(float(word["end"]), 3),
                    "confidence": round(float(word.get("score", 0.0)), 4),
                    "speakerCluster": word.get("speaker", "UNKNOWN"),
                }
            )

    return {
        "provider": "whisperx",
        "model": f"whisper-{model_name}",
        "modelVersion": model_name,
        "languageCode": LANGUAGE_CODE,
        "alignmentModel": ALIGNMENT_MODEL_NAME,
        "diarizationModel": DIARIZATION_MODEL_NAME,
        "decodeParamsHash": decode_params_hash(decode_params),
        "confidenceSource": "whisperx-align-score",
        "promptBiasedRetries": 0,
        "transcribedAt": datetime.now(timezone.utc).isoformat(),
        "words": words,
        # Full resolved params kept alongside for forensics (raw-asr.json), not
        # part of the RawAsrResult contract itself.
        "_decodeParams": decode_params,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="S3 whisperX transcription sidecar")
    parser.add_argument("--audio", required=True, help="Path to audio.wav")
    parser.add_argument("--hf-token", required=True, help="Hugging Face token for pyannote diarization")
    parser.add_argument("--model", default=MODEL_NAME, help="Whisper model name (default: large-v3)")
    args = parser.parse_args()

    try:
        result = run_pipeline(args.audio, args.hf_token, args.model)
    except Exception as exc:  # noqa: BLE001 - sidecar boundary: report and exit non-zero
        print(f"transcribe.py failed: {exc}", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result))


if __name__ == "__main__":
    main()
