"""The note pipeline: audio in, a reviewed draft out.

`process_note` is what the API enqueues from `POST /notes/{id}/submit`. It runs
on whichever worker is on the queue, so it stays deliberately portable:

1. fetch the audio (local media volume, else the API's 60 s signed URL over HTTPS),
2. ffmpeg to 16 kHz mono WAV, then Parakeet (or the demo engine) for a transcript,
3. one title (LLM or first sentence),
4. the safety lexicon, which sets processing -> draft | held | blocked and logs it,
5. write title, body and word timings back to the note.

Nothing here knows about HTTP or author identity; it never sees a position.
"""

import asyncio
import os
import tempfile
import uuid
from pathlib import Path

import httpx

from app import storage
from app.config import get_settings
from app.db import SessionLocal
from app.repositories import notes as notes_repo
from app.services import safety

from . import asr, titles

# A gap this long between sentences starts a new paragraph in the story body.
PARAGRAPH_PAUSE_SEC = 0.8
MAX_SENTENCES_PER_PARAGRAPH = 3
SENTENCE_ENDINGS = ".!?"


def build_body(words: list[asr.WordTiming], text: str) -> tuple[str, list[dict]]:
    """Group word timings into paragraphs and flatten them for the notes.words column.

    Returns (body, words) where body separates paragraphs with a blank line (the app
    splits on `\\n{2,}`) and each word carries its paragraph index for the playback highlight.
    """
    if not words:
        return text.strip(), []

    sentences: list[list[asr.WordTiming]] = []
    current: list[asr.WordTiming] = []
    for word in words:
        current.append(word)
        if word.word.strip().endswith(tuple(SENTENCE_ENDINGS)):
            sentences.append(current)
            current = []
    if current:
        sentences.append(current)

    paragraphs: list[list[asr.WordTiming]] = []
    paragraph: list[asr.WordTiming] = []
    previous_end: float | None = None
    for sentence in sentences:
        gap = sentence[0].start_sec - previous_end if previous_end is not None else 0.0
        if paragraph and (gap >= PARAGRAPH_PAUSE_SEC or len(paragraph) >= MAX_SENTENCES_PER_PARAGRAPH):
            paragraphs.append(paragraph)
            paragraph = []
        paragraph.extend(sentence)
        previous_end = sentence[-1].end_sec
    if paragraph:
        paragraphs.append(paragraph)

    body_parts: list[str] = []
    flat: list[dict] = []
    for index, para in enumerate(paragraphs):
        body_parts.append(" ".join(word.word.strip() for word in para).strip())
        for word in para:
            flat.append(
                {
                    "word": word.word.strip(),
                    "start": round(word.start_sec, 3),
                    "end": round(word.end_sec, 3),
                    "paragraph": index,
                }
            )
    return "\n\n".join(part for part in body_parts if part), flat


async def _fetch_audio(audio_key: str) -> bytes:
    """Read the recording locally when we share the media volume, else pull the signed URL.

    The GPU worker does not share the API's disk, so it downloads from the API instead.
    """
    try:
        return await asyncio.to_thread(storage.open, audio_key)
    except storage.MissingMedia:
        pass

    base = get_settings().api_base_url.rstrip("/")
    url = f"{base}{storage.signed_url(audio_key)}"
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


def _transcribe_sync(note_id: str, data: bytes, suffix: str) -> asr.Transcript:
    with tempfile.TemporaryDirectory(prefix="speakez-") as work:
        source = os.path.join(work, f"{note_id}.{suffix}")
        Path(source).write_bytes(data)
        # Never the same path as `source`: WAV uploads arrive as .wav, and ffmpeg refuses to
        # overwrite its own input (exit 234), which left every WAV note stuck at "processing".
        wav_path = os.path.join(work, f"{note_id}.16k.wav")
        asr.to_wav_16k_mono(source, wav_path)
        return asr.transcribe(wav_path)


async def process_note(ctx, note_id: str) -> None:
    """Turn one submitted note into a reviewed draft. Safe to retry; only moves "processing".

    arq always calls a job as `fn(ctx, *args)`, so `ctx` must stay the first parameter;
    without it every job fails with a TypeError and notes sit at "processing" forever.
    """
    try:
        note_uuid = uuid.UUID(note_id)
    except ValueError:
        return

    async with SessionLocal() as session:
        row = await notes_repo.note_summary(session, note_uuid)
    if row is None:
        return
    status, _visibility, _landmark_id, _body, _words, audio_key = row
    if status != "processing" or not audio_key:
        return

    suffix = audio_key.rsplit(".", 1)[-1] if "." in audio_key else "m4a"
    data = await _fetch_audio(audio_key)
    transcript = await asyncio.to_thread(_transcribe_sync, note_id, data, suffix)
    body, words = build_body(transcript.words, transcript.text)
    title = await titles.title_for(transcript.text)

    async with SessionLocal() as session:
        try:
            # One transaction: transcript, safety verdict and the new status land together.
            await notes_repo.save_transcript(session, note_uuid, title, body, words)
            await safety.apply_transcript_verdict(session, note_uuid, transcript.text)
        except safety.NoteNotProcessing:
            await session.rollback()
