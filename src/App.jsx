import { useEffect, useRef, useState } from "react";

const audioContext = new AudioContext();

const playSound = (frequency, duration) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = "sine";

  oscillator.start();

  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + duration
  );

  oscillator.stop(audioContext.currentTime + duration);
};

const startSound = () => playSound(700, 0.15);
const beep = () => playSound(1000, 0.08);

function App() {
  const [startTime, setStartTime] = useState(30);
  const [time, setTime] = useState(30);
  const [progress, setProgress] = useState(100);
  const [question, setQuestion] = useState(1);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [pressedButton, setPressedButton] = useState("");
  const [flash, setFlash] = useState(false);

  const startAtRef = useRef(null);
  const animationRef = useRef(null);
  const lastBeepSecondRef = useRef(null);

  useEffect(() => {
    if (!running) return;

    startAtRef.current = performance.now();
    lastBeepSecondRef.current = null;

    const update = () => {
      const elapsed = (performance.now() - startAtRef.current) / 1000;
      const remaining = Math.max(0, startTime - elapsed);
      const percent = Math.max(0, (remaining / startTime) * 100);
      const displayTime = Math.ceil(remaining);

      setProgress(percent);
      setTime(displayTime);

      if (
        soundOn &&
        displayTime <= 5 &&
        displayTime > 0 &&
        displayTime !== lastBeepSecondRef.current
      ) {
        beep();
        lastBeepSecondRef.current = displayTime;
      }

      if (remaining <= 0) {
        if (soundOn) startSound();

        setQuestion((q) => q + 1);
        startAtRef.current = performance.now();
        lastBeepSecondRef.current = null;
      }

      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationRef.current);
  }, [running, startTime, soundOn]);

  useEffect(() => {
    if (time <= 5 && time > 0) {
      setFlash(true);

      const timeout = setTimeout(() => {
        setFlash(false);
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [time]);

  return (
    <>
      <style>
        {`
          @keyframes pop {
            0% {
              transform: scale(0.7);
              opacity: 0;
            }
            70% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "sans-serif",
          backgroundColor: flash ? "#660000" : "black",
          color: "white",
          padding: "20px",
          boxSizing: "border-box",
          transition: "background-color 0.15s",
        }}
      >
        <h1
          key={question}
          style={{
            fontSize: "40px",
            animation: "pop 0.25s ease",
          }}
        >
          問題 {question}
        </h1>

        <select
          value={startTime}
          disabled={running}
          onChange={(e) => {
            const newTime = Number(e.target.value);
            setStartTime(newTime);
            setTime(newTime);
            setProgress(100);
          }}
          style={{
            fontSize: "20px",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "10px",
            opacity: running ? 0.5 : 1,
          }}
        >
          <option value={15}>15秒</option>
          <option value={30}>30秒</option>
          <option value={60}>60秒</option>
          <option value={90}>90秒</option>
        </select>

        <div
          style={{
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: `conic-gradient(
              from 0deg,
              #333 0% ${100 - progress}%,
              ${time <= 5 ? "red" : "lime"} ${100 - progress}% 100%
            )`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: "270px",
              height: "270px",
              borderRadius: "50%",
              backgroundColor: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "70px",
                fontWeight: "bold",
                color: time <= 5 ? "red" : "white",
              }}
            >
              {`00:${String(time).padStart(2, "0")}`}
            </div>
          </div>
        </div>

        <button
          onClick={() => setSoundOn((v) => !v)}
          style={{
            fontSize: "18px",
            padding: "8px 16px",
            marginBottom: "20px",
            backgroundColor: soundOn ? "#22c55e" : "#555",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>

        <div
          style={{
            display: "flex",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          <button
            disabled={running}
            onClick={() => {
              if (soundOn) startSound();
              setRunning(true);
            }}
            style={{
              fontSize: "20px",
              padding: "10px 22px",
              backgroundColor: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              opacity: running ? 0.5 : 1,
            }}
          >
            START
          </button>

          <button
            onMouseDown={() => setPressedButton("stop")}
            onMouseUp={() => setPressedButton("")}
            onMouseLeave={() => setPressedButton("")}
            onTouchStart={() => setPressedButton("stop")}
            onTouchEnd={() => setPressedButton("")}
            onClick={() => setRunning(false)}
            style={{
              fontSize: "20px",
              padding: "10px 22px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "0.1s",
              transform: pressedButton === "stop" ? "scale(0.95)" : "scale(1)",
            }}
          >
            STOP
          </button>

          <button
            onMouseDown={() => setPressedButton("reset")}
            onMouseUp={() => setPressedButton("")}
            onMouseLeave={() => setPressedButton("")}
            onTouchStart={() => setPressedButton("reset")}
            onTouchEnd={() => setPressedButton("")}
            onClick={() => {
              setRunning(false);
              setTime(startTime);
              setProgress(100);
              setQuestion(1);
            }}
            style={{
              fontSize: "20px",
              padding: "10px 22px",
              backgroundColor: "#666",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "0.1s",
              transform:
                pressedButton === "reset" ? "scale(0.95)" : "scale(1)",
            }}
          >
            RESET
          </button>
        </div>
      </div>
    </>
  );
}

export default App;