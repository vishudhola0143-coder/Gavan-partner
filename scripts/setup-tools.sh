#!/usr/bin/env bash
# Installs the video-editing toolchain: FFmpeg, whisper.cpp (+base model), yt-dlp, Remotion, HyperFrames.
set -e
T=/root/tools
mkdir -p "$T"
command -v ffmpeg >/dev/null || (apt-get update -qq && apt-get install -y -qq ffmpeg)
pip install -q -U yt-dlp
npm i -g hyperframes >/dev/null 2>&1
if [ ! -x "$T/whisper.cpp/build/bin/whisper-cli" ]; then
  [ -d "$T/whisper.cpp" ] || git clone -q --depth 1 https://github.com/ggml-org/whisper.cpp.git "$T/whisper.cpp"
  cmake -S "$T/whisper.cpp" -B "$T/whisper.cpp/build" -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_TESTS=OFF >/dev/null
  cmake --build "$T/whisper.cpp/build" -j"$(nproc)" --config Release >/dev/null
fi
[ -f "$T/whisper.cpp/models/ggml-base.bin" ] || bash "$T/whisper.cpp/models/download-ggml-model.sh" base >/dev/null
ln -sf "$T/whisper.cpp/build/bin/whisper-cli" /usr/local/bin/whisper-cli
if [ ! -d "$T/remotion/node_modules/remotion" ]; then
  mkdir -p "$T/remotion" && cd "$T/remotion" && npm init -y >/dev/null && npm i -s remotion @remotion/cli react react-dom
fi
echo "Video tools ready"
