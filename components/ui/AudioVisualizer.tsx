import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    audioContext: AudioContext;
    audioUrl: string;
    onOptionsChange: (options: {
        speed: number;
        points: number;
        height: number;
        amplitude: number;
    }) => void;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioContext, audioUrl, onOptionsChange }) => {
    const sourceRef = useRef<null | AudioBufferSourceNode>(null);
    const analyserRef = useRef<AnalyserNode>(
        audioContext ? audioContext.createAnalyser() : new AnalyserNode( 
            audioContext,
            {
                fftSize: 2048,
                maxDecibels: -10,
                minDecibels: -100,
                smoothingTimeConstant: 0.8,
            }
        )
    );

    useEffect(() => {
        if (!audioContext) {
            return;
        }

        if (!analyserRef.current) {
            analyserRef.current = new AnalyserNode(audioContext, {
                fftSize: 2048,
                maxDecibels: -10,
                minDecibels: -100,
                smoothingTimeConstant: 0.8,
            });
        }

        const fetchData = async () => {
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            if (sourceRef.current) {
                sourceRef.current.disconnect();
            }
            sourceRef.current = audioContext.createBufferSource();
            sourceRef.current.buffer = audioBuffer;

            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContext.destination);

            sourceRef.current.start();

            function processAudioData() {
                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                analyserRef.current.getByteFrequencyData(dataArray);

                const minFrequency = 0;
                const maxFrequency = 255;
                const minAmplitude = 0;
                const maxAmplitude = 255;

                const options = {
                    speed: mapValue(dataArray[0], minFrequency, maxFrequency, 0.1, 1),
                    points: mapValue(dataArray[0], minFrequency, maxFrequency, 1, 5),
                    height: mapValue(dataArray[0], minAmplitude, maxAmplitude, 1, 20),
                    amplitude: mapValue(dataArray[0], minAmplitude, maxAmplitude, 1, 50),
                };

                onOptionsChange(options);

                requestAnimationFrame(processAudioData);
            }

            processAudioData();
        };

        fetchData();

        return () => {
            sourceRef.current?.stop();
            sourceRef.current?.disconnect();
        };
    }, [audioContext, audioUrl, onOptionsChange]);

    function mapValue(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }

    return <div className='hidden'>Playing audio file: {audioUrl}</div>;
};

export default AudioVisualizer;