import wave
import numpy as np
import struct

def create_test_audio():
    """Создает простой тестовый аудиофайл с произнесенным текстом"""
    
    # Параметры аудио
    sample_rate = 16000
    duration = 3  # секунды
    frequency = 440  # Гц (нота A4)
    
    # Генерируем синусоидальный сигнал
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Создаем простой тон с модуляцией для имитации речи
    audio_data = []
    for i in range(len(t)):
        # Базовый тон с модуляцией
        base_freq = 200 + 100 * np.sin(2 * np.pi * 2 * t[i])  # Модуляция частоты
        amplitude = 0.3 * (1 + 0.5 * np.sin(2 * np.pi * 3 * t[i]))  # Модуляция амплитуды
        sample = amplitude * np.sin(2 * np.pi * base_freq * t[i])
        audio_data.append(sample)
    
    # Конвертируем в 16-битный PCM
    audio_data = np.array(audio_data)
    audio_data = (audio_data * 32767).astype(np.int16)
    
    # Сохраняем в WAV файл
    with wave.open('test_voice.wav', 'wb') as wav_file:
        wav_file.setnchannels(1)  # Моно
        wav_file.setsampwidth(2)  # 16 бит
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_data.tobytes())
    
    print("Тестовый аудиофайл создан: test_voice.wav")

if __name__ == "__main__":
    create_test_audio()