const SUPPORTED_AUDIO_NAME = /\.(aac|flac|m4a|mp3|ogg|opus|wav|webm)$/i;

export function bindLocalAudioFile({
  audio,
  input,
  name,
  onInvalid,
  onSelected,
}) {
  let objectUrl = null;

  function release() {
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }

  function handleChange() {
    const file = input.files?.[0];
    if (!file) return;
    if (
      !file.type.startsWith("audio/") &&
      !SUPPORTED_AUDIO_NAME.test(file.name)
    ) {
      onInvalid();
      return;
    }
    audio.pause();
    release();
    objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    audio.load();
    name.textContent = file.name;
    name.title = file.name;
    onSelected(file);
  }

  input.addEventListener("change", handleChange);
  return () => {
    input.removeEventListener("change", handleChange);
    release();
  };
}
