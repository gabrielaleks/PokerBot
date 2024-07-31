from dotenv import load_dotenv
from pyannote.audio import Pipeline
from pydub import AudioSegment
from openai import OpenAI
import time
import os
import sys
import soundfile as sf


# Save each segment associated to a unique speaker as separate audio file
def diarize_audio(diarizations_path, audio_file, diarization):
    audio = AudioSegment.from_wav(audio_file)

    # Specify output directory and create it if it doesn't exist
    os.makedirs(diarizations_path, exist_ok=True)

    for i, (segment, section_id, speaker_id) in enumerate(diarization):
        start_time, end_time = segment.start, segment.end

        # Extract the segment from the original audio
        segment_audio = audio[start_time * 1000 : end_time * 1000]

        # Save the segment as a separate audio file
        output_file = os.path.join(
            diarizations_path,
            f"{os.path.splitext(os.path.basename(audio_file))[0]}-chunk_{i+1}-speaker_{speaker_id}.wav",
        )
        segment_audio.export(output_file, format="wav")
        print(f"Fragment {i+1} saved as {output_file}")


def extract_chunk_number(file_name):
    return int(file_name.split("-chunk_")[1].split("-")[0])


def transcribe_diarized_files(diarizations_path, transcription_path, openai_key):
    file_names_sorted = sorted(os.listdir(diarizations_path), key=extract_chunk_number)

    for file_name in file_names_sorted:
        try:
            if file_name.endswith(".wav"):
                raw_audio_file_path = os.path.join(diarizations_path, file_name)
                duration = get_audio_duration(raw_audio_file_path)
                if duration >= 0.1:
                    speaker_id = file_name.split("-speaker_")[-1].split(".")[0]
                    transcribe_audio(
                        raw_audio_file_path, transcription_path, speaker_id, openai_key
                    )
        except Exception as e:
            print(f"Error processing file {file_name}: {e}")
            continue


# A file needs to be at least 0.1 seconds long to be transcribed.
def get_audio_duration(audio_file_path):
    with sf.SoundFile(audio_file_path, "r") as f:
        return len(f) / f.samplerate


def transcribe_audio(
    raw_audio_file_path, transcription_path, speaker_id, openai_apikey
):
    client = OpenAI(api_key=openai_apikey)

    with open(raw_audio_file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1", file=audio_file
        )

        # Create the transcription folder if it doesn't exist
        output_folder = os.path.dirname(transcription_path)
        os.makedirs(output_folder, exist_ok=True)

        # Append speaker ID and transcription to the output txt file
        with open(transcription_path, "a") as output_file:
            output_file.write(f"{speaker_id}\n")
            output_file.write(transcription.text)
            output_file.write("\n\n")


def run(base_audio_file_name, uuid):
    load_dotenv("../../../../../../.env")
    start_time = time.perf_counter()

    audio_base_path = os.path.dirname(os.path.abspath(__file__))

    if not audio_base_path or not isinstance(audio_base_path, str):
        raise ValueError(
            "AUDIO_BASE_PATH environment variable is not set or not a string"
        )

    resources_path = os.path.join(audio_base_path, "resources", uuid)

    diarizations_path = os.path.join(resources_path, "diarizations")
    raw_audio_file_path = os.path.join(
        resources_path, "raw_audio", base_audio_file_name + ".wav"
    )
    transcription_path = os.path.join(
        resources_path, "transcription", base_audio_file_name + ".txt"
    )

    openai_key = os.getenv("OPENAI_API_KEY")
    huggingface_key = os.getenv("HUGGINGFACE_API_KEY")

    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=huggingface_key,
    )

    # Execute speaker diarization on audio file
    print("Starting diarization...")
    diarization = pipeline(raw_audio_file_path)
    print("Finished diarization!")

    # Save each segment as a separate audio file
    print("Starting file fragmentation...")
    diarize_audio(
        diarizations_path,
        raw_audio_file_path,
        diarization.itertracks(yield_label=True),
    )
    print("Finished file fragmentation!")

    # Transcribe audio segments into unified text file
    print("Starting transcription...")
    transcribe_diarized_files(diarizations_path, transcription_path, openai_key)
    print("Finished transcription!")

    end_time = time.perf_counter()
    elapsed_time = end_time - start_time
    print("Elapsed time:", round(elapsed_time, 2), "seconds!")


base_audio_file_name = sys.argv[1]
uuid = sys.argv[2]
run(base_audio_file_name, uuid)
