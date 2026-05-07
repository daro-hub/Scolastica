"""
AssemblyAI service for transcription, subtitles, and karaoke generation.
Sends original audio/video files directly to AssemblyAI API without preprocessing.
"""
import os
import httpx

ASSEMBLYAI_API_KEY = os.getenv('ASSEMBLYAI_API_KEY', '')
BASE_URL = 'https://api.assemblyai.com/v2'


def _headers():
    return {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
    }


async def upload_file(file_path: str) -> str:
    """
    Upload file to AssemblyAI and return the upload_url.
    Sends the original file as-is without any conversion.
    """
    headers = {'authorization': ASSEMBLYAI_API_KEY}
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        with open(file_path, 'rb') as f:
            response = await client.post(
                f'{BASE_URL}/upload',
                headers=headers,
                content=f.read(),
            )
        response.raise_for_status()
        return response.json()['upload_url']


async def transcribe(
    upload_url: str,
    speaker_labels: bool = False,
) -> dict:
    """
    Request transcription from AssemblyAI.
    - speaker_labels: enable speaker diarization for karaoke mode
    Returns the completed transcript data.
    """
    payload = {
        'audio_url': upload_url,
        'speech_models': ['universal-3-pro'],
        'speaker_labels': speaker_labels,
        'language_detection': True,
        'punctuate': True,
        'format_text': True,
        'disfluencies': False,
    }
    
    if speaker_labels:
        payload['prompt'] = (
            'This is a conversation between multiple speakers. '
            'Pay close attention to speaker changes, especially when: '
            '1) A question is followed by an answer - these are different speakers. '
            '2) There is a change in topic or perspective. '
            '3) One person addresses another directly. '
            '4) The tone or speaking style changes. '
            'Even if voices sound similar, use conversational context and turn-taking patterns '
            'to distinguish between speakers. A response to a question always indicates a speaker change.'
        )
    
    async with httpx.AsyncClient(timeout=600.0) as client:
        # Submit transcription request
        response = await client.post(
            f'{BASE_URL}/transcript',
            headers=_headers(),
            json=payload,
        )
        if response.status_code != 200:
            error_detail = response.text
            raise Exception(f"AssemblyAI error {response.status_code}: {error_detail}")
        transcript_id = response.json()['id']
        
        # Poll for completion
        while True:
            poll_response = await client.get(
                f'{BASE_URL}/transcript/{transcript_id}',
                headers=_headers(),
            )
            poll_response.raise_for_status()
            data = poll_response.json()
            
            if data['status'] == 'completed':
                return data
            elif data['status'] == 'error':
                raise Exception(f"Transcription failed: {data.get('error', 'Unknown error')}")
            
            # Wait before polling again
            import asyncio
            await asyncio.sleep(3)


def generate_srt(transcript_data: dict, with_speakers: bool = False) -> str:
    """
    Generate SRT content from AssemblyAI transcript data.
    - with_speakers: include speaker labels (for karaoke)
    """
    words = transcript_data.get('words', [])
    if not words:
        return ''
    
    srt_lines = []
    index = 1
    
    # Group words into subtitle segments (~5 words or ~3 seconds each)
    segment_words = []
    segment_start = None
    
    for word in words:
        if segment_start is None:
            segment_start = word['start']
        
        segment_words.append(word)
        
        # Create new segment every 5 words or 3 seconds
        duration = word['end'] - segment_start
        if len(segment_words) >= 5 or duration >= 3000:
            segment_end = word['end']
            text = ' '.join(w['text'] for w in segment_words)
            
            if with_speakers and 'speaker' in segment_words[0]:
                speaker = segment_words[0].get('speaker', 'A')
                text = f'[Speaker {speaker}] {text}'
            
            srt_lines.append(str(index))
            srt_lines.append(f'{_ms_to_srt_time(segment_start)} --> {_ms_to_srt_time(segment_end)}')
            srt_lines.append(text)
            srt_lines.append('')
            
            index += 1
            segment_words = []
            segment_start = None
    
    # Handle remaining words
    if segment_words:
        segment_end = segment_words[-1]['end']
        text = ' '.join(w['text'] for w in segment_words)
        
        if with_speakers and 'speaker' in segment_words[0]:
            speaker = segment_words[0].get('speaker', 'A')
            text = f'[Speaker {speaker}] {text}'
        
        srt_lines.append(str(index))
        srt_lines.append(f'{_ms_to_srt_time(segment_start)} --> {_ms_to_srt_time(segment_end)}')
        srt_lines.append(text)
        srt_lines.append('')
    
    return '\n'.join(srt_lines)


def _ms_to_srt_time(ms: int) -> str:
    """Convert milliseconds to SRT timestamp format (HH:MM:SS,mmm)."""
    hours = ms // 3600000
    minutes = (ms % 3600000) // 60000
    seconds = (ms % 60000) // 1000
    millis = ms % 1000
    return f'{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}'


async def create_subtitles(file_path: str) -> bytes:
    """
    Full pipeline: upload file, transcribe, generate SRT.
    Returns SRT content as bytes.
    """
    upload_url = await upload_file(file_path)
    transcript = await transcribe(upload_url, speaker_labels=False)
    srt_content = generate_srt(transcript, with_speakers=False)
    return srt_content.encode('utf-8')


async def create_karaoke(file_path: str) -> bytes:
    """
    Full pipeline with speaker diarization for karaoke-style subtitles.
    Returns SRT content as bytes.
    """
    upload_url = await upload_file(file_path)
    transcript = await transcribe(upload_url, speaker_labels=True)
    srt_content = generate_srt(transcript, with_speakers=True)
    return srt_content.encode('utf-8')
